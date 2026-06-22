const whatsappNumbers = [
  {
    label: "UAE WhatsApp",
    detail: "+971 50 559 6425",
    number: "971505596425",
  },
  {
    label: "Georgia WhatsApp",
    detail: "+995 511 55 30 24",
    number: "995511553024",
  },
];

const customerStorageKey = "flySkyCustomer";
const enquiryStorageKey = "flySkyEnquiries";
const firebaseCdnVersion = "10.12.5";

const firebaseState = {
  ready: false,
  user: null,
  enquiries: [],
  unsubscribeEnquiries: null,
  auth: null,
  db: null,
  authApi: null,
  firestoreApi: null,
};

function getWhatsappText(url) {
  try {
    return new URL(url).searchParams.get("text") || "Hello Fly Sky Tourism, I would like more details.";
  } catch (error) {
    return "Hello Fly Sky Tourism, I would like more details.";
  }
}

function isMobileDevice() {
  return /Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent);
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };

    return entities[character];
  });
}

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch (error) {
    return fallback;
  }
}

function getFirebaseConfig() {
  const config = window.FLYSKY_FIREBASE_CONFIG || {};
  return config.apiKey && config.projectId && config.authDomain ? config : null;
}

function getCustomer() {
  if (firebaseState.user) {
    return {
      provider: firebaseState.user.providerData[0]?.providerId || "Firebase",
      name: firebaseState.user.displayName || firebaseState.user.email || "Customer",
      email: firebaseState.user.email || "",
      uid: firebaseState.user.uid,
      cloud: true,
    };
  }

  return readJson(customerStorageKey, null);
}

function getSavedEnquiries() {
  return firebaseState.user ? firebaseState.enquiries : readJson(enquiryStorageKey, []);
}

function saveCustomer(customer) {
  localStorage.setItem(customerStorageKey, JSON.stringify(customer));
}

function setLoginButtonState() {
  const customer = getCustomer();

  document.querySelectorAll(".nav-login").forEach((button) => {
    button.textContent = customer ? customer.name.split(" ")[0] || "Account" : "Login";
  });
}

function renderAccountSummary() {
  const customer = getCustomer();
  const savedEnquiries = getSavedEnquiries()
    .filter((item) => !customer || !item.customerEmail || item.customerEmail === customer.email)
    .slice(0, 5);
  const accountSummary = document.querySelector("#accountSummary");
  const providerList = document.querySelector("#providerList");
  const loginDetails = document.querySelector("#loginDetails");
  const loginChoiceNote = document.querySelector("#loginChoiceNote");

  if (!accountSummary || !providerList || !loginDetails) return;

  providerList.hidden = Boolean(customer);
  loginDetails.hidden = true;
  accountSummary.hidden = !customer;

  if (!customer) {
    if (loginChoiceNote) {
      loginChoiceNote.textContent = firebaseState.ready
        ? "Choose a login source to sync enquiries in real time."
        : "Add Firebase config to enable real-time login. Local save is available for preview.";
    }
    return;
  }

  accountSummary.innerHTML = `
    <div class="account-card">
      <strong>${escapeHtml(customer.name)}</strong>
      <span>${escapeHtml(customer.email)}</span>
      <small>${customer.cloud ? "Real-time cloud sync active" : `Saved on this device with ${escapeHtml(customer.provider)}`}</small>
    </div>
    <div class="account-history">
      <strong>Saved enquiries</strong>
      ${
        savedEnquiries.length
          ? savedEnquiries
              .map(
                (item) => `
                  <div>
                    <span>${escapeHtml(item.service || "Travel enquiry")} - ${escapeHtml(item.destination || "Destination")}</span>
                    <small>${formatSavedDate(item.savedAt || item.createdAt)}</small>
                  </div>
                `,
              )
              .join("")
          : "<p>No saved enquiries yet.</p>"
      }
    </div>
    <button type="button" class="button ghost full" data-logout>Logout</button>
  `;
}

function formatSavedDate(value) {
  if (!value) return "Just now";

  if (typeof value.toDate === "function") {
    return value.toDate().toLocaleDateString();
  }

  return new Date(value).toLocaleDateString();
}

async function initFirebase() {
  const config = getFirebaseConfig();
  if (!config) {
    setLoginButtonState();
    return;
  }

  try {
    const [{ initializeApp }, authApi, firestoreApi] = await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${firebaseCdnVersion}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${firebaseCdnVersion}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${firebaseCdnVersion}/firebase-firestore.js`),
    ]);
    const app = initializeApp(config);

    firebaseState.authApi = authApi;
    firebaseState.firestoreApi = firestoreApi;
    firebaseState.auth = authApi.getAuth(app);
    firebaseState.db = firestoreApi.getFirestore(app);
    firebaseState.ready = true;

    authApi.onAuthStateChanged(firebaseState.auth, (user) => {
      firebaseState.user = user;
      setLoginButtonState();
      subscribeToEnquiries();
      renderAccountSummary();
    });
  } catch (error) {
    console.warn("Firebase could not start. Local account mode is still available.", error);
  }
}

function subscribeToEnquiries() {
  if (firebaseState.unsubscribeEnquiries) {
    firebaseState.unsubscribeEnquiries();
    firebaseState.unsubscribeEnquiries = null;
  }

  if (!firebaseState.user || !firebaseState.db) {
    firebaseState.enquiries = [];
    return;
  }

  const { collection, limit, onSnapshot, orderBy, query } = firebaseState.firestoreApi;
  const enquiriesRef = collection(firebaseState.db, "customers", firebaseState.user.uid, "enquiries");
  const enquiriesQuery = query(enquiriesRef, orderBy("createdAt", "desc"), limit(25));

  firebaseState.unsubscribeEnquiries = onSnapshot(enquiriesQuery, (snapshot) => {
    firebaseState.enquiries = snapshot.docs.map((documentSnapshot) => ({
      id: documentSnapshot.id,
      ...documentSnapshot.data(),
    }));
    renderAccountSummary();
  });
}

async function syncCustomerProfile(user) {
  if (!firebaseState.db || !user) return;

  const { doc, serverTimestamp, setDoc } = firebaseState.firestoreApi;
  await setDoc(
    doc(firebaseState.db, "customers", user.uid),
    {
      name: user.displayName || user.email || "Customer",
      email: user.email || "",
      provider: user.providerData[0]?.providerId || "email",
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

async function signInWithProvider(providerName) {
  if (!firebaseState.ready) return false;

  const {
    GoogleAuthProvider,
    OAuthProvider,
    signInWithPopup,
  } = firebaseState.authApi;
  const provider =
    providerName === "Google"
      ? new GoogleAuthProvider()
      : new OAuthProvider(providerName === "Apple" ? "apple.com" : "microsoft.com");
  const credential = await signInWithPopup(firebaseState.auth, provider);
  await syncCustomerProfile(credential.user);
  return true;
}

async function signInWithEmail(email, password, name) {
  if (!firebaseState.ready) return false;

  const {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile,
  } = firebaseState.authApi;

  try {
    const credential = await createUserWithEmailAndPassword(firebaseState.auth, email, password);
    await updateProfile(credential.user, { displayName: name });
    await syncCustomerProfile(credential.user);
  } catch (error) {
    if (error.code !== "auth/email-already-in-use") throw error;

    const credential = await signInWithEmailAndPassword(firebaseState.auth, email, password);
    if (name && !credential.user.displayName) {
      await updateProfile(credential.user, { displayName: name });
    }
    await syncCustomerProfile(credential.user);
  }

  return true;
}

async function saveEnquiry(enquiry) {
  const customer = getCustomer();
  const record = {
    id: Date.now(),
    savedAt: new Date().toISOString(),
    customerName: customer?.name || enquiry.name || "",
    customerEmail: customer?.email || enquiry.email || "",
    provider: customer?.provider || "Guest",
    ...enquiry,
  };

  if (firebaseState.user && firebaseState.db) {
    const { addDoc, collection, serverTimestamp } = firebaseState.firestoreApi;
    await addDoc(collection(firebaseState.db, "customers", firebaseState.user.uid, "enquiries"), {
      ...record,
      createdAt: serverTimestamp(),
    });
    return record;
  }

  const savedEnquiries = readJson(enquiryStorageKey, []);
  savedEnquiries.unshift(record);
  localStorage.setItem(enquiryStorageKey, JSON.stringify(savedEnquiries.slice(0, 25)));
  return record;
}

window.flySkySaveEnquiry = saveEnquiry;

function buildSiteModals() {
  const container = document.createElement("div");
  container.innerHTML = `
    <div class="choice-modal" id="loginModal" hidden>
      <div class="choice-modal-backdrop" data-close-modal></div>
      <div class="choice-panel" role="dialog" aria-modal="true" aria-labelledby="loginModalTitle">
        <button class="modal-close" type="button" data-close-modal aria-label="Close login options">x</button>
        <p class="eyebrow">Customer login</p>
        <h2 id="loginModalTitle">Choose a login option</h2>
        <div class="provider-list" id="providerList">
          <button type="button" data-login-provider="Google"><span>G</span>Continue with Google</button>
          <button type="button" data-login-provider="Apple"><span>A</span>Continue with Apple</button>
          <button type="button" data-login-provider="Microsoft"><span>M</span>Continue with Microsoft</button>
          <button type="button" data-login-provider="Email"><span>@</span>Continue with email</button>
        </div>
        <form class="login-detail-form" id="loginDetails" hidden>
          <input type="hidden" name="provider" />
          <label>
            <span>Full name</span>
            <input name="name" type="text" placeholder="Customer name" required />
          </label>
          <label>
            <span>Email</span>
            <input name="email" type="email" placeholder="name@example.com" required />
          </label>
          <label>
            <span>Password</span>
            <input name="password" type="password" placeholder="Minimum 6 characters" minlength="6" />
          </label>
          <button class="button primary full" type="submit">Login / create account</button>
        </form>
        <div class="account-summary" id="accountSummary" hidden></div>
        <p class="form-note" id="loginChoiceNote" role="status">Preparing login options.</p>
      </div>
    </div>
    <div class="choice-modal" id="whatsappModal" hidden>
      <div class="choice-modal-backdrop" data-close-modal></div>
      <div class="choice-panel" role="dialog" aria-modal="true" aria-labelledby="whatsappModalTitle">
        <button class="modal-close" type="button" data-close-modal aria-label="Close WhatsApp options">x</button>
        <p class="eyebrow">WhatsApp</p>
        <h2 id="whatsappModalTitle">Message Fly Sky Tourism</h2>
        <div class="whatsapp-choice-list" id="whatsappChoiceList"></div>
      </div>
    </div>
  `;
  document.body.append(...container.children);
}

buildSiteModals();

const loginModal = document.querySelector("#loginModal");
const whatsappModal = document.querySelector("#whatsappModal");
const whatsappChoiceList = document.querySelector("#whatsappChoiceList");
const loginChoiceNote = document.querySelector("#loginChoiceNote");
const loginDetails = document.querySelector("#loginDetails");

function openModal(modal) {
  if (modal === loginModal) {
    renderAccountSummary();
  }

  modal.hidden = false;
  document.body.classList.add("modal-open");
}

function closeModals() {
  document.querySelectorAll(".choice-modal").forEach((modal) => {
    modal.hidden = true;
  });
  document.body.classList.remove("modal-open");
}

document.addEventListener("click", async (event) => {
  const loginButton = event.target.closest(".nav-login");
  if (loginButton) {
    event.preventDefault();
    openModal(loginModal);
    return;
  }

  const whatsappLink = event.target.closest('a[href*="wa.me"]');
  if (whatsappLink) {
    event.preventDefault();
    const message = getWhatsappText(whatsappLink.href);
    whatsappChoiceList.innerHTML = whatsappNumbers
      .map(
        (item) => `
          <a href="https://api.whatsapp.com/send?phone=${item.number}&text=${encodeURIComponent(message)}" data-whatsapp-number="${item.number}" data-whatsapp-message="${encodeURIComponent(message)}" target="_blank" rel="noreferrer">
            <strong>${item.label}</strong>
            <span>${item.detail}</span>
          </a>
        `,
      )
      .join("");
    openModal(whatsappModal);
    return;
  }

  const emailEnquiryLink = event.target.closest('a[href^="mailto:info.flyskytourism@gmail.com"][href*="subject="], a[href^="mailto:info@flyskytourism.com"][href*="subject="]');
  if (emailEnquiryLink) {
    event.preventDefault();
    const mailUrl = new URL(emailEnquiryLink.href);
    const subject = mailUrl.searchParams.get("subject") || "Travel enquiry";
    const body = mailUrl.searchParams.get("body") || "";

    if (window.flySkySaveEnquiry) {
      await window.flySkySaveEnquiry({
        service: subject.includes("Hotel") ? "Hotel only" : "Travel enquiry",
        destination: subject.split(" - ").pop() || "",
        requirements: body,
      });
    }

    window.location.href = emailEnquiryLink.href;
    return;
  }

  const whatsappChoice = event.target.closest("[data-whatsapp-number]");
  if (whatsappChoice && isMobileDevice()) {
    event.preventDefault();
    window.location.href = `whatsapp://send?phone=${whatsappChoice.dataset.whatsappNumber}&text=${whatsappChoice.dataset.whatsappMessage}`;
    closeModals();
    return;
  }

  if (event.target.closest("[data-close-modal]")) {
    closeModals();
    return;
  }

  const providerButton = event.target.closest("[data-login-provider]");
  if (providerButton) {
    const providerName = providerButton.dataset.loginProvider;

    if (providerName !== "Email" && firebaseState.ready) {
      try {
        loginChoiceNote.textContent = `Opening ${providerName} login.`;
        await signInWithProvider(providerName);
        loginChoiceNote.textContent = "Login complete. Your enquiries sync in real time.";
        renderAccountSummary();
      } catch (error) {
        loginChoiceNote.textContent = "Login was not completed. Please try again.";
      }
      return;
    }

    loginDetails.hidden = false;
    loginDetails.querySelector('[name="provider"]').value = providerName;
    loginDetails.querySelector('[name="password"]').required = firebaseState.ready;
    loginChoiceNote.textContent = firebaseState.ready
      ? "Enter email and password to login or create an account."
      : `${providerName} selected. Add Firebase config for real login; this preview saves locally.`;
    loginDetails.querySelector('[name="name"]').focus();
    return;
  }

  if (event.target.closest("[data-logout]")) {
    if (firebaseState.user && firebaseState.auth) {
      await firebaseState.authApi.signOut(firebaseState.auth);
    }
    localStorage.removeItem(customerStorageKey);
    setLoginButtonState();
    renderAccountSummary();
    loginChoiceNote.textContent = "You are logged out.";
  }
});

loginDetails.addEventListener("submit", async (event) => {
  event.preventDefault();

  const data = new FormData(loginDetails);
  const provider = data.get("provider");
  const name = data.get("name");
  const email = data.get("email");
  const password = data.get("password");

  try {
    loginChoiceNote.textContent = "Saving login.";

    if (firebaseState.ready && provider === "Email") {
      await signInWithEmail(email, password, name);
    } else {
      saveCustomer({
        provider,
        name,
        email,
        signedInAt: new Date().toISOString(),
      });
    }

    loginDetails.reset();
    setLoginButtonState();
    renderAccountSummary();
    loginChoiceNote.textContent = firebaseState.ready
      ? "Login saved. Your enquiries will sync in real time."
      : "Preview login saved on this device.";
  } catch (error) {
    loginChoiceNote.textContent = "Login failed. Check the details and enabled Firebase provider.";
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeModals();
  }
});

setLoginButtonState();
initFirebase();

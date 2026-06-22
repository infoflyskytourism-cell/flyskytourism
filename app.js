const packages = window.destinationData;

const packageGrid = document.querySelector("#packageGrid");
const toursOnlyGrid = document.querySelector("#toursOnlyGrid");
const bookingForm = document.querySelector("#bookingForm");
const quickSearchForm = document.querySelector("#quickSearchForm");
const formNote = document.querySelector("#formNote");
const bookingService = bookingForm.querySelector('[name="service"]');
const bookingDestination = bookingForm.querySelector('[name="destination"]');
const bookingDates = bookingForm.querySelector('[name="dates"]');
const bookingRequirements = bookingForm.querySelector('[name="requirements"]');
const heroSlides = [...document.querySelectorAll(".hero-slide")];
const heroSlideButtons = [...document.querySelectorAll("[data-hero-slide]")];

function escapeHtml(value = "") {
  return value.replace(/[&<>"']/g, (character) => {
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

function renderPrice(value = "") {
  return window.flySkyCurrency
    ? window.flySkyCurrency.priceMarkupFromText(value, escapeHtml)
    : escapeHtml(value);
}

function showHeroSlide(index) {
  heroSlides.forEach((slide, slideIndex) => {
    slide.classList.toggle("is-active", slideIndex === index);
  });
  heroSlideButtons.forEach((button, buttonIndex) => {
    button.classList.toggle("is-active", buttonIndex === index);
  });
}

heroSlideButtons.forEach((button) => {
  button.addEventListener("click", () => {
    showHeroSlide(Number(button.dataset.heroSlide));
  });
});

if (heroSlides.length) {
  let activeSlide = 0;
  window.setInterval(() => {
    activeSlide = (activeSlide + 1) % heroSlides.length;
    showHeroSlide(activeSlide);
  }, 3000);
}

packageGrid.innerHTML = packages
  .map(
    (item) => `
      <article class="package-card" data-destination="${item.slug}" tabindex="0" role="link" aria-label="Open ${item.name} itinerary options">
        <div class="package-media" style="background-image: linear-gradient(135deg, rgba(13, 107, 87, 0.12), rgba(227, 108, 79, 0.18)), url('${item.image}')" role="img" aria-label="${item.name} travel package"></div>
        <div class="package-body">
          <h3>${item.name}</h3>
          <p>${item.tagline}</p>
          <button type="button" data-destination="${item.slug}">View itineraries</button>
        </div>
      </article>
    `,
  )
  .join("");

function getBaseTours() {
  return packages.flatMap((destination) =>
    (destination.packages || []).map((tourPackage) => ({
      title: tourPackage.title,
      destination: destination.name,
      duration: tourPackage.duration,
      price: tourPackage.price,
      summary: tourPackage.summary,
      image: tourPackage.image,
      document: tourPackage.document || "",
      destinationSlug: destination.slug,
      packageSlug: tourPackage.slug || tourPackage.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    })),
  );
}

function renderToursOnly() {
  const tours = getBaseTours();

  toursOnlyGrid.innerHTML = tours
    .map((tour) => {
      const title = escapeHtml(tour.title);
      const destination = escapeHtml(tour.destination);
      const duration = escapeHtml(tour.duration);
      const price = renderPrice(tour.price);
      const summary = escapeHtml(tour.summary);
      const image = escapeHtml(tour.image || "assets/main-caucasus-package/image-24.png");
      const documentLink = tour.document
        ? `<a class="button ghost" href="${escapeHtml(tour.document)}" download>Download itinerary</a>`
        : "";
      const destinationLink = tour.destinationSlug
        ? `<a class="button primary" href="destination.html?place=${encodeURIComponent(tour.destinationSlug)}&package=${encodeURIComponent(tour.packageSlug)}">View itinerary</a>`
        : `<a class="button primary" href="#booking" data-tour-booking="${title}" data-tour-destination="${destination}">Enquire now</a>`;

      return `
        <article class="tour-only-card">
          <div class="tour-only-media" style="background-image: linear-gradient(135deg, rgba(75, 0, 8, 0.34), rgba(201, 162, 74, 0.18)), url('${image}')" role="img" aria-label="${title} tour image"></div>
          <div class="tour-only-body">
            <div class="tour-only-heading">
              <div>
                <p class="package-kicker">${destination} - ${duration}</p>
                <h3>${title}</h3>
              </div>
              <strong>${price}</strong>
            </div>
            <p>${summary}</p>
            <div class="tour-only-actions">
              ${destinationLink}
              ${documentLink}
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

renderToursOnly();
window.flySkyCurrency?.updateCurrencyElements();

toursOnlyGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-tour-booking]");
  if (!button) return;

  bookingService.value = "Tour activity";
  bookingDestination.value = button.dataset.tourDestination;
  bookingRequirements.value = `${button.dataset.tourBooking}\nPlease share available dates and final quote.`;
  document.querySelector("#booking").scrollIntoView({ behavior: "smooth" });
});

packageGrid.addEventListener("click", (event) => {
  const card = event.target.closest("[data-destination]");
  if (!card) return;

  window.location.href = `destination.html?place=${encodeURIComponent(card.dataset.destination)}`;
});

packageGrid.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const card = event.target.closest("[data-destination]");
  if (!card) return;
  event.preventDefault();
  window.location.href = `destination.html?place=${encodeURIComponent(card.dataset.destination)}`;
});

quickSearchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(quickSearchForm);
  bookingService.value = data.get("service");
  bookingDestination.value = data.get("destination");
  bookingDates.value = data.get("travelDate") || "";
  bookingRequirements.value = `Guests: ${data.get("guests") || "2"}`;
  document.querySelector("#booking").scrollIntoView({ behavior: "smooth" });
});

document.querySelectorAll("[data-package-enquiry]").forEach((button) => {
  button.addEventListener("click", () => {
    bookingService.value = "Holiday package";
    bookingDestination.value = "Grand Caucasus";
    bookingRequirements.value = `${button.dataset.packageEnquiry}\nGuests: 30 pax group / please share available departure and final quote.`;
  });
});

bookingForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const data = new FormData(bookingForm);
  const subject = `New ${data.get("service")} enquiry - ${data.get("destination")}`;
  const submitButton = bookingForm.querySelector('[type="submit"]');

  bookingForm.querySelector('[name="_subject"]').value = subject;
  bookingForm.querySelector('[name="_replyto"]').value = data.get("email") || "";
  bookingForm.querySelector('[name="_next"]').value = "";
  data.set("_subject", subject);
  data.set("_replyto", data.get("email") || "");
  data.delete("_next");

  submitButton.disabled = true;
  formNote.textContent = "Sending your enquiry securely.";

  try {
    const response = await fetch(bookingForm.action, {
      method: "POST",
      body: data,
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Enquiry could not be sent.");
    }

    if (window.flySkySaveEnquiry) {
      await window.flySkySaveEnquiry({
        name: data.get("name"),
        phone: data.get("phone"),
        email: data.get("email"),
        service: data.get("service"),
        destination: data.get("destination"),
        dates: data.get("dates"),
        requirements: data.get("requirements"),
      });
    }

    bookingForm.reset();
    formNote.textContent = "Thank you. Your enquiry has been sent.";
  } catch (error) {
    formNote.textContent = "Sorry, the enquiry could not be sent. Please try WhatsApp or email.";
  } finally {
    submitButton.disabled = false;
  }
});

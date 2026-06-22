const params = new URLSearchParams(window.location.search);
const requestedPlace = params.get("place") || "grand-caucasus";
const requestedPackage = params.get("package") || "";
const destination =
  window.destinationData.find((item) => item.slug === requestedPlace.toLowerCase()) ||
  window.destinationData[0];

const currencyFormatter = new Intl.NumberFormat("en-AE", {
  style: "currency",
  currency: "AED",
  maximumFractionDigits: 0,
});

const destinationName = document.querySelector("#destinationName");
const destinationTagline = document.querySelector("#destinationTagline");
const destinationHeroMedia = document.querySelector("#destinationHeroMedia");
const placesDestination = document.querySelector("#placesDestination");
const placesGrid = document.querySelector("#placesGrid");
const tourPackageSection = document.querySelector("#tourPackages");
const tourPackageGrid = document.querySelector("#tourPackageGrid");
const packageSectionTitle = document.querySelector("#packageSectionTitle");
const packageSectionIntro = document.querySelector("#packageSectionIntro");
const packageDetailSection = document.querySelector("#packageDetail");
const packageDetailContent = document.querySelector("#packageDetailContent");
const hotelSection = document.querySelector("#hotels");
const hotelGrid = document.querySelector("#hotelGrid");
const destinationToolbar = document.querySelector(".destination-toolbar");
const commissionRate = document.querySelector("#commissionRate");
const nightCount = document.querySelector("#nightCount");
const checkInDate = document.querySelector("#checkInDate");
const whatsappDestination = document.querySelector("#whatsappDestination");

const today = new Date();
today.setDate(today.getDate() + 7);
checkInDate.value = today.toISOString().slice(0, 10);

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

function packageSlug(tourPackage) {
  return (
    tourPackage.slug ||
    tourPackage.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
  );
}

function renderList(items = []) {
  return items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function renderItinerary(items = []) {
  return items
    .map((item, index) => {
      if (typeof item === "string") {
        return `<li>${escapeHtml(item)}</li>`;
      }

      return `
        <article class="day-card">
          <img src="${escapeHtml(item.image || destination.image)}" alt="${escapeHtml(item.title || `Day ${index + 1}`)}" loading="lazy" />
          <div>
            <span>${escapeHtml(item.day || `Day ${index + 1}`)}</span>
            <h3>${escapeHtml(item.title || "")}</h3>
            <p>${escapeHtml(item.details || "")}</p>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderDocumentLink(tourPackage) {
  if (!tourPackage.document) return "";

  return `<a class="button ghost document-button" href="${escapeHtml(tourPackage.document)}" download>Download itinerary DOCX</a>`;
}

function packageDetailUrl(tourPackage) {
  return `destination.html?place=${encodeURIComponent(destination.slug)}&package=${encodeURIComponent(packageSlug(tourPackage))}`;
}

document.title = `${destination.name} | Fly Sky Tourism`;
destinationName.textContent = destination.name;
destinationTagline.textContent = destination.tagline;
placesDestination.textContent = destination.name;
destinationHeroMedia.style.backgroundImage = `linear-gradient(90deg, rgba(10, 20, 22, 0.72), rgba(10, 20, 22, 0.12)), url("${destination.image}")`;
whatsappDestination.href = `https://wa.me/971505596425?text=${encodeURIComponent(`I want ${destination.name} hotels and package details`)}`;

placesGrid.innerHTML = (destination.places || [])
  .map(
    (place) => `
      <article class="place-card">
        <strong>${escapeHtml(place.name)}</strong>
        <p>${escapeHtml(place.note)}</p>
      </article>
    `,
  )
  .join("");

function renderPackageOptions() {
  if (!destination.packages || !destination.packages.length) {
    tourPackageSection.hidden = true;
    return;
  }

  packageSectionTitle.textContent = `${destination.name} itinerary options`;
  packageSectionIntro.textContent =
    "Choose a package to open the complete day-wise itinerary with photos, inclusions, highlights, and pricing.";
  tourPackageSection.hidden = false;
  tourPackageGrid.innerHTML = destination.packages
    .map(
      (tourPackage) => `
        <a class="itinerary-option-card" href="${packageDetailUrl(tourPackage)}" aria-label="Open ${escapeHtml(tourPackage.title)} itinerary">
          <div class="itinerary-option-media" style="background-image: linear-gradient(135deg, rgba(75, 0, 8, 0.08), rgba(201, 162, 74, 0.08)), url('${escapeHtml(tourPackage.image)}')" role="img" aria-label="${escapeHtml(tourPackage.title)} package image"></div>
          <div class="itinerary-option-body">
            <span class="package-kicker">${escapeHtml(tourPackage.duration)}</span>
            <h3>${escapeHtml(tourPackage.title)}</h3>
            <p>${escapeHtml(tourPackage.summary)}</p>
            <div>
              <strong>${escapeHtml(tourPackage.price)}</strong>
              <span>View complete itinerary</span>
            </div>
          </div>
        </a>
      `,
    )
    .join("");
}

function renderPackageDetail(tourPackage) {
  document.title = `${tourPackage.title} | Fly Sky Tourism`;
  destinationName.textContent = tourPackage.title;
  destinationTagline.textContent = tourPackage.summary;
  destinationHeroMedia.style.backgroundImage = `linear-gradient(90deg, rgba(10, 20, 22, 0.74), rgba(10, 20, 22, 0.12)), url("${tourPackage.image}")`;
  whatsappDestination.href = `https://wa.me/971505596425?text=${encodeURIComponent(`I want complete details for ${tourPackage.title}`)}`;
  tourPackageSection.hidden = true;
  packageDetailSection.hidden = false;

  const pricing = tourPackage.pricing && tourPackage.pricing.length
    ? `<div class="detail-block"><h2>Pricing</h2><ul>${renderList(tourPackage.pricing)}</ul></div>`
    : "";

  packageDetailContent.innerHTML = `
    <div class="package-detail-layout">
      <aside class="package-detail-summary">
        <p class="eyebrow">Complete package details</p>
        <h2>${escapeHtml(tourPackage.title)}</h2>
        <div class="detail-price">${escapeHtml(tourPackage.price)}</div>
        <div class="detail-facts">
          <span>${escapeHtml(tourPackage.duration)}</span>
          <span>${escapeHtml(destination.name)}</span>
        </div>
        <p>${escapeHtml(tourPackage.summary)}</p>
        <a class="button primary full" href="mailto:info.flyskytourism@gmail.com?subject=${encodeURIComponent(`Package enquiry - ${tourPackage.title}`)}&body=${encodeURIComponent(`Destination: ${destination.name}\nPackage: ${tourPackage.title}\nDuration: ${tourPackage.duration}\nPrice: ${tourPackage.price}`)}">Enquire about package</a>
        ${renderDocumentLink(tourPackage)}
      </aside>
      <div class="package-detail-main">
        <div class="detail-columns">
          <div class="detail-block">
            <h2>Highlights</h2>
            <ul>${renderList(tourPackage.highlights)}</ul>
          </div>
          <div class="detail-block">
            <h2>Inclusions</h2>
            <ul>${renderList(tourPackage.includes)}</ul>
          </div>
        </div>
        ${pricing}
        <div class="detail-block day-wise-block">
          <h2>Day-wise itinerary</h2>
          <div class="day-wise-grid">${renderItinerary(tourPackage.itinerary)}</div>
        </div>
        <div class="detail-block">
          <h2>Photo gallery</h2>
          <div class="docx-gallery detail-gallery">
            ${(tourPackage.gallery || [tourPackage.image])
              .map(
                (image, index) => `
                  <a href="${escapeHtml(image)}" target="_blank" rel="noreferrer" aria-label="Open ${escapeHtml(tourPackage.title)} image ${index + 1}">
                    <img src="${escapeHtml(image)}" alt="${escapeHtml(tourPackage.title)} image ${index + 1}" loading="lazy" />
                  </a>
                `,
              )
              .join("")}
          </div>
        </div>
      </div>
    </div>
  `;
}

const selectedPackage = (destination.packages || []).find(
  (tourPackage) => packageSlug(tourPackage) === requestedPackage.toLowerCase(),
);

if (selectedPackage) {
  renderPackageDetail(selectedPackage);
} else {
  renderPackageOptions();
}

function sellingPrice(net, commission) {
  return Math.round(net * (1 + commission));
}

function renderHotels() {
  if (!destination.hotels || !destination.hotels.length) {
    destinationToolbar.hidden = true;
    hotelSection.hidden = true;
    return;
  }

  const commission = Number(commissionRate.value);
  const nights = Math.max(1, Number(nightCount.value || 1));

  hotelGrid.innerHTML = destination.hotels
    .map((hotel) => {
      const nightlySell = sellingPrice(hotel.net, commission);
      const totalSell = nightlySell * nights;
      const commissionAmount = nightlySell - hotel.net;
      const stars = "★".repeat(hotel.rating);

      return `
        <article class="hotel-card">
          <div class="hotel-media" style="background-image: linear-gradient(135deg, rgba(13, 107, 87, 0.1), rgba(227, 108, 79, 0.16)), url('${escapeHtml(hotel.image)}')" role="img" aria-label="${escapeHtml(hotel.name)} hotel image"></div>
          <div class="hotel-body">
            <div>
              <p class="hotel-area">${escapeHtml(hotel.area)}</p>
              <h3>${escapeHtml(hotel.name)}</h3>
              <p class="stars" aria-label="${hotel.rating} star hotel">${stars}</p>
            </div>
            <div class="price-box">
              <span>Supplier net</span>
              <strong>${currencyFormatter.format(hotel.net)}</strong>
            </div>
            <div class="price-box commission">
              <span>Your commission</span>
              <strong>${currencyFormatter.format(commissionAmount)}</strong>
            </div>
            <div class="sell-price">
              <span>Customer price / night</span>
              <strong>${currencyFormatter.format(nightlySell)}</strong>
              <small>${currencyFormatter.format(totalSell)} for ${nights} night${nights > 1 ? "s" : ""}</small>
            </div>
            <a class="button primary full" href="mailto:info.flyskytourism@gmail.com?subject=${encodeURIComponent(`Hotel enquiry - ${hotel.name}, ${destination.name}`)}&body=${encodeURIComponent(`Destination: ${destination.name}\nHotel: ${hotel.name}\nArea: ${hotel.area}\nCheck-in: ${checkInDate.value}\nNights: ${nights}\nCustomer price: ${currencyFormatter.format(totalSell)}\nCommission included: ${Math.round(commission * 100)}%`)}">Book / enquire</a>
          </div>
        </article>
      `;
    })
    .join("");
}

commissionRate.addEventListener("change", renderHotels);
nightCount.addEventListener("input", renderHotels);
checkInDate.addEventListener("change", renderHotels);

renderHotels();

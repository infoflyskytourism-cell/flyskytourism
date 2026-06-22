(() => {
  const ratesFromUsd = {
    USD: 1,
    AED: 3.67,
    INR: 83.5,
    EUR: 0.92,
  };

  const localeByCurrency = {
    USD: "en-US",
    AED: "en-AE",
    INR: "en-IN",
    EUR: "en-IE",
  };

  const allowedCurrencies = Object.keys(ratesFromUsd);
  const storedCurrency = localStorage.getItem("flySkyCurrency");
  let activeCurrency = allowedCurrencies.includes(storedCurrency) ? storedCurrency : "USD";

  function formatAmount(amount, currency = activeCurrency) {
    return new Intl.NumberFormat(localeByCurrency[currency], {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  function convertAmount(amount, baseCurrency, targetCurrency = activeCurrency) {
    if (!ratesFromUsd[baseCurrency] || !ratesFromUsd[targetCurrency]) return amount;
    const amountInUsd = amount / ratesFromUsd[baseCurrency];
    return amountInUsd * ratesFromUsd[targetCurrency];
  }

  function updateCurrencyElements() {
    document.querySelectorAll("[data-currency-amount]").forEach((element) => {
      const amount = Number(element.dataset.currencyAmount);
      const base = element.dataset.currencyBase || "USD";
      const prefix = element.dataset.currencyPrefix || "";
      const suffix = element.dataset.currencySuffix || "";
      const converted = convertAmount(amount, base);
      element.textContent = `${prefix}${formatAmount(converted)}${suffix}`;
    });
  }

  function setCurrency(currency) {
    if (!allowedCurrencies.includes(currency)) return;
    activeCurrency = currency;
    localStorage.setItem("flySkyCurrency", currency);
    document.querySelectorAll("[data-currency-select]").forEach((select) => {
      select.value = currency;
    });
    updateCurrencyElements();
    window.dispatchEvent(new CustomEvent("flysky:currency-change", { detail: { currency } }));
  }

  function bindSelectors() {
    document.querySelectorAll("[data-currency-select]").forEach((select) => {
      select.value = activeCurrency;
      select.addEventListener("change", () => setCurrency(select.value));
    });
    updateCurrencyElements();
  }

  function priceMarkupFromText(text, escapeHtml = (value) => String(value)) {
    const match = String(text).match(/^(.*?)(USD|AED)\s*([\d,]+)(.*)$/i);
    if (!match) return escapeHtml(text);

    const [, prefix, baseCurrency, rawAmount, suffix] = match;
    const amount = Number(rawAmount.replace(/,/g, ""));
    if (!Number.isFinite(amount)) return escapeHtml(text);

    return `<span data-currency-base="${baseCurrency.toUpperCase()}" data-currency-amount="${amount}" data-currency-prefix="${escapeHtml(prefix)}" data-currency-suffix="${escapeHtml(suffix)}">${escapeHtml(text)}</span>`;
  }

  window.flySkyCurrency = {
    bindSelectors,
    convertAmount,
    formatAmount,
    priceMarkupFromText,
    setCurrency,
    updateCurrencyElements,
    get current() {
      return activeCurrency;
    },
  };

  document.addEventListener("DOMContentLoaded", bindSelectors);
})();

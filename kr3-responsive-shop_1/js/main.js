"use strict";

document.documentElement.classList.add("has-js");

function initDisclosure(buttonSelector, panelSelector, breakpoint) {
  const button = document.querySelector(buttonSelector);
  const panel = document.querySelector(panelSelector);
  if (!button || !panel) return;

  const setOpen = (open) => {
    button.setAttribute("aria-expanded", String(open));
    panel.classList.toggle("is-open", open);
  };

  button.addEventListener("click", () => setOpen(button.getAttribute("aria-expanded") !== "true"));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && button.getAttribute("aria-expanded") === "true") {
      setOpen(false);
      button.focus();
    }
  });
  panel.addEventListener("click", (event) => {
    if (event.target.closest("a") && window.innerWidth < breakpoint) setOpen(false);
  });
  window.matchMedia(`(min-width: ${breakpoint}px)`).addEventListener("change", (event) => {
    if (event.matches) setOpen(false);
  });
}

initDisclosure(".site-nav__toggle", ".site-nav", 768);
initDisclosure(".catalog-filters__toggle", ".catalog-filters", 1024);

const filtersForm = document.getElementById("catalog-filter-form");
if (filtersForm) {
  const cards = [...document.querySelectorAll(".catalog-products .product-card")];
  const count = document.querySelector(".catalog-products__count");
  const empty = document.querySelector(".catalog-products__empty");

  const applyFilters = () => {
    const categories = [...filtersForm.querySelectorAll('input[name="category"]:checked')].map((item) => item.value);
    const minText = filtersForm.elements.namedItem("price-from").value.trim();
    const maxText = filtersForm.elements.namedItem("price-to").value.trim();
    const minimum = minText === "" ? 0 : Number(minText);
    const maximum = maxText === "" ? Infinity : Number(maxText);
    const stock = filtersForm.querySelector('input[name="stock"]:checked')?.value || "all";
    let found = 0;

    for (const card of cards) {
      const price = Number(card.dataset.price);
      const matches = (!categories.length || categories.includes(card.dataset.category)) &&
        price >= minimum && price <= maximum &&
        (stock === "all" || card.dataset.stock === "true");
      card.hidden = !matches;
      if (matches) found++;
    }
    count.textContent = `Найдено: ${found}`;
    empty.hidden = found !== 0;
  };

  filtersForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!filtersForm.reportValidity()) return;
    const minText = filtersForm.elements.namedItem("price-from").value;
    const maxText = filtersForm.elements.namedItem("price-to").value;
    if (minText !== "" && maxText !== "" && Number(minText) > Number(maxText)) {
      filtersForm.elements.namedItem("price-to").setCustomValidity("Максимальная цена должна быть не меньше минимальной.");
      filtersForm.reportValidity();
      filtersForm.elements.namedItem("price-to").setCustomValidity("");
      return;
    }
    applyFilters();
  });
  filtersForm.addEventListener("reset", () => requestAnimationFrame(applyFilters));
}

function initAccessibleForm(formId, messageId, onSuccess = () => {}) {
  const form = document.getElementById(formId);
  const successMessage = document.getElementById(messageId);
  if (!form || !successMessage) return;

  form.noValidate = true;
  const fields = [...form.querySelectorAll("input, select, textarea")].filter((field) => field.willValidate);
  const summary = document.createElement("p");
  summary.className = "form-error-summary";
  summary.setAttribute("role", "alert");
  summary.hidden = true;
  form.prepend(summary);

  const fieldError = (field) => {
    const validity = field.validity;
    if (validity.valueMissing) return field.type === "checkbox" ? "Подтвердите согласие." : "Заполните обязательное поле.";
    if (validity.typeMismatch) return "Введите корректный адрес электронной почты.";
    if (validity.patternMismatch) return "Проверьте формат: +7 (900) 000-00-00.";
    if (validity.tooShort) return `Введите не менее ${field.minLength} символов.`;
    if (validity.rangeUnderflow) return `Значение должно быть не меньше ${field.min}.`;
    if (validity.rangeOverflow) return `Значение должно быть не больше ${field.max}.`;
    return "Проверьте правильность заполнения поля.";
  };

  const updateDescription = (field, id, add) => {
    const ids = (field.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean).filter((item) => item !== id);
    if (add) ids.push(id);
    if (ids.length) field.setAttribute("aria-describedby", ids.join(" "));
    else field.removeAttribute("aria-describedby");
  };

  const validate = (field) => {
    const id = `${field.id}-error`;
    const container = field.closest(".order-form__field") || field.closest(".order-form__field--checkbox") || field.parentElement;
    let error = document.getElementById(id);
    if (field.checkValidity()) {
      error?.remove();
      field.removeAttribute("aria-invalid");
      updateDescription(field, id, false);
      return true;
    }
    field.setAttribute("aria-invalid", "true");
    if (!error) {
      error = document.createElement("p");
      error.className = "form-error";
      error.id = id;
      container.append(error);
    }
    error.textContent = fieldError(field);
    updateDescription(field, id, true);
    return false;
  };

  fields.forEach((field, index) => {
    if (!field.id) field.id = `${formId}-field-${index}`;
    for (const name of ["input", "change"]) {
      field.addEventListener(name, () => {
        if (field.hasAttribute("aria-invalid")) validate(field);
      });
    }
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    successMessage.hidden = true;
    let firstInvalid = null;
    for (const field of fields) {
      if (!validate(field) && !firstInvalid) firstInvalid = field;
    }
    if (firstInvalid) {
      summary.textContent = "Исправьте ошибки в отмеченных полях.";
      summary.hidden = false;
      firstInvalid.focus();
      return;
    }
    summary.hidden = true;
    form.reset();
    for (const field of fields) {
      document.getElementById(`${field.id}-error`)?.remove();
      field.removeAttribute("aria-invalid");
      updateDescription(field, `${field.id}-error`, false);
    }
    onSuccess();
    successMessage.hidden = false;
    successMessage.setAttribute("tabindex", "-1");
    requestAnimationFrame(() => {
      successMessage.focus({ preventScroll: true });
      successMessage.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
    });
  });
}

const dialog = document.getElementById("order-dialog");
if (dialog) {
  const close = document.getElementById("close-order-dialog");
  const cancel = document.getElementById("cancel-order-dialog");
  const selected = document.getElementById("selected-product");
  const selectedText = document.getElementById("selected-product-text");
  const success = document.getElementById("success-message");

  document.querySelectorAll(".product-card__button").forEach((button) => {
    button.addEventListener("click", () => {
      const name = button.dataset.product || "Канцтовар";
      if (selected) selected.value = name;
      if (selectedText) selectedText.textContent = `Выбранный товар: ${name}`;
      if (success) success.hidden = true;
      dialog.showModal();
      close?.focus();
    });
  });
  close?.addEventListener("click", () => dialog.close());
  cancel?.addEventListener("click", () => dialog.close());
  initAccessibleForm("order-form", "success-message", () => {
    if (selectedText) selectedText.textContent = "Выбранный товар будет указан автоматически.";
    dialog.close();
  });
}

initAccessibleForm("page-order-form", "page-success-message");
initAccessibleForm("feedback-form", "feedback-success-message");

"use strict";

function initAccessibleForm(formId, messageId, onSuccess = () => {}) {
  const form = document.getElementById(formId);
  const successMessage = document.getElementById(messageId);

  if (!form || !successMessage) {
    return;
  }

  form.noValidate = true;

  const fields = Array.from(
    form.querySelectorAll("input, select, textarea")
  ).filter((field) => field.willValidate);

  const errorSummary = document.createElement("p");

  errorSummary.className = "form-error-summary";
  errorSummary.setAttribute("role", "alert");
  errorSummary.hidden = true;

  form.prepend(errorSummary);

  function getErrorMessage(field) {
    if (field.validity.valueMissing) {
      if (field.type === "checkbox") {
        return "Необходимо подтвердить согласие.";
      }

      return "Заполните обязательное поле.";
    }

    if (field.validity.typeMismatch) {
      return "Введите корректный адрес электронной почты.";
    }

    if (field.validity.patternMismatch) {
      return "Проверьте формат: +7 (900) 000-00-00.";
    }

    if (field.validity.tooShort) {
      return `Введите не менее ${field.minLength} символов.`;
    }

    if (field.validity.rangeUnderflow) {
      return `Значение должно быть не меньше ${field.min}.`;
    }

    if (field.validity.rangeOverflow) {
      return `Значение должно быть не больше ${field.max}.`;
    }

    return "Проверьте правильность заполнения поля.";
  }

  function updateDescription(field, errorId, addError) {
    const descriptionIds = (
      field.getAttribute("aria-describedby") || ""
    )
      .split(/\s+/)
      .filter(Boolean)
      .filter((id) => id !== errorId);

    if (addError) {
      descriptionIds.push(errorId);
    }

    if (descriptionIds.length > 0) {
      field.setAttribute(
        "aria-describedby",
        descriptionIds.join(" ")
      );
    } else {
      field.removeAttribute("aria-describedby");
    }
  }

  function clearFieldError(field) {
    const errorId = `${field.id}-error`;

    const errorElement = document.getElementById(errorId);

    if (errorElement) {
      errorElement.remove();
    }

    field.removeAttribute("aria-invalid");

    updateDescription(field, errorId, false);
  }

  function validateField(field) {
    const errorId = `${field.id}-error`;

    if (field.checkValidity()) {
      clearFieldError(field);
      return true;
    }

    field.setAttribute("aria-invalid", "true");

    const fieldContainer = field.closest(".order-form__field");

    let errorElement = document.getElementById(errorId);

    if (!errorElement && fieldContainer) {
      errorElement = document.createElement("p");

      errorElement.id = errorId;
      errorElement.className = "form-error";

      fieldContainer.append(errorElement);
    }

    if (errorElement) {
      errorElement.textContent = getErrorMessage(field);
    }

    updateDescription(field, errorId, true);

    return false;
  }

  fields.forEach((field) => {
    const updateError = () => {
      if (field.hasAttribute("aria-invalid")) {
        validateField(field);
      }
    };

    field.addEventListener("input", updateError);
    field.addEventListener("change", updateError);
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    successMessage.hidden = true;

    let firstInvalidField = null;

    fields.forEach((field) => {
      const isValid = validateField(field);

      if (!isValid && !firstInvalidField) {
        firstInvalidField = field;
      }
    });

    if (firstInvalidField) {
      errorSummary.textContent =
        "Проверьте заполнение формы. Ошибочные поля отмечены ниже.";

      errorSummary.hidden = false;

      firstInvalidField.focus();

      return;
    }

    errorSummary.hidden = true;
    errorSummary.textContent = "";

    form.reset();

    fields.forEach(clearFieldError);

    onSuccess();

    successMessage.hidden = false;
    successMessage.setAttribute("tabindex", "-1");

    requestAnimationFrame(() => {
      successMessage.focus({
        preventScroll: true
      });

      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      successMessage.scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
        block: "center"
      });
    });
  });
}

const orderDialog = document.getElementById("order-dialog");

const closeDialogButton = document.getElementById(
  "close-order-dialog"
);

const cancelDialogButton = document.getElementById(
  "cancel-order-dialog"
);

const selectedProductInput = document.getElementById(
  "selected-product"
);

const selectedProductText = document.getElementById(
  "selected-product-text"
);

const successMessage = document.getElementById(
  "success-message"
);

if (orderDialog) {
  const orderButtons = document.querySelectorAll(
    ".product-card__button"
  );

  orderButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const productName =
        button.dataset.product || "Канцтовар";

      if (selectedProductInput) {
        selectedProductInput.value = productName;
      }

      if (selectedProductText) {
        selectedProductText.textContent =
          `Выбранный товар: ${productName}`;
      }

      if (successMessage) {
        successMessage.hidden = true;
      }

      orderDialog.showModal();

      if (closeDialogButton) {
        closeDialogButton.focus();
      }
    });
  });

  function closeOrderDialog() {
    orderDialog.close();
  }

  if (closeDialogButton) {
    closeDialogButton.addEventListener(
      "click",
      closeOrderDialog
    );
  }

  if (cancelDialogButton) {
    cancelDialogButton.addEventListener(
      "click",
      closeOrderDialog
    );
  }
}

initAccessibleForm(
  "order-form",
  "success-message",
  () => {
    if (selectedProductText) {
      selectedProductText.textContent =
        "Выбранный товар будет указан автоматически.";
    }

    if (orderDialog && orderDialog.open) {
      orderDialog.close();
    }
  }
);

initAccessibleForm(
  "page-order-form",
  "page-success-message"
);
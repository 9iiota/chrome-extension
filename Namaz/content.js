// Select the <select> element by name attribute
const selectElement = document.querySelector('select[name="country"]');
const valueToSelect = '4'; // Replace with the actual value you want to select

// Set the select element's value and dispatch the change event
selectElement.value = valueToSelect;
selectElement.dispatchEvent(new Event('change'));
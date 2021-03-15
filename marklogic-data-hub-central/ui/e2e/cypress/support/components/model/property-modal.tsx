class PropertyModal {
  newPropertyName(str: string) {
    cy.get("#property-name").focus().type(str);
  }

  clearPropertyName() {
    cy.get("#property-name").focus().clear();
  }

  getStructuredTypeName() {
    return cy.get("#structured-label");
  }

  openPropertyDropdown() {
    cy.get(".ant-cascader-picker").trigger("mouseover").click();
  }

  clearPropertyDropdown() {
    cy.findByLabelText("icon: close-circle").trigger("mouseover").click();
  }

  getTypeFromDropdown(type: string) {
    return cy.get(`ul > li`).first().get(`[title="${type}"]`).should("be.visible");
  }

  getCascadedTypeFromDropdown(type: string) {
    return cy.get(`ul > li`).last().get(`[title="${type}"]`).should("be.visible");
  }

  getYesRadio(radioValue: string) {
    return cy.findByLabelText(`${radioValue}-yes`);
  }

  getNoRadio(radioLabel: string) {
    return cy.findByLabelText(`${radioLabel}-no`);
  }

  getCheckbox(checkboxId: string) {
    return cy.get(`#${checkboxId}`);
  }

  clickCheckbox(checkboxId: string) {
    return cy.get(`#${checkboxId}`).check();
  }

  getCancelButton() {
    return cy.findByLabelText("property-modal-cancel");
  }

  getSubmitButton() {
    return cy.findByLabelText("property-modal-submit");
  }
  getDeleteIcon(propertyName: string) {
    return cy.findByTestId(`delete-${propertyName}`);
  }
  getToggleStepsButton() {
    return cy.findByLabelText("toggle-steps");
  }

  getJoinPropertyDropdown() {
    return  cy.findByPlaceholderText("Select a join property");
  }

  openJoinPropertyDropdown() {
    cy.findByLabelText("joinProperty-select").trigger("mouseover").click();
  }

  getJoinProperty(propertyName: string) {
    return cy.waitUntil(() => cy.findByLabelText(`${propertyName}-option`));
  }
}

const propertyModal = new PropertyModal();
export default propertyModal;

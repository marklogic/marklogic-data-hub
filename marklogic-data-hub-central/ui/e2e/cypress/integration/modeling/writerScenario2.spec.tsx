/// <reference types="cypress"/>

import modelPage from "../../support/pages/model";
import {
  entityTypeModal,
  entityTypeTable,
  propertyModal,
  propertyTable,
  structuredTypeModal
} from "../../support/components/model/index";
import {confirmationModal, toolbar} from "../../support/components/common/index";
import {Application} from "../../support/application.config";
import {ConfirmationType} from "../../support/types/modeling-types";
import LoginPage from "../../support/pages/login";
import "cypress-wait-until";

describe("Entity Modeling: Writer Role", () => {
  //Scenarios: can create entity, can create a structured type, duplicate structured type name check, add properties to structure type, add structure type as property, delete structured type, and delete entity, can add new properties to existing Entities, revert all entities, add multiple entities, add properties, delete properties, save all entities, delete an entity with relationship warning
  //login with valid account
  before(() => {
    cy.visit("/");
    cy.contains(Application.title);
    cy.loginAsTestUserWithRoles("hub-central-entity-model-reader", "hub-central-entity-model-writer", "hub-central-saved-query-user").withRequest();
    LoginPage.postLogin();
    cy.waitForAsyncRequest();
  });
  beforeEach(() => {
    cy.loginAsTestUserWithRoles("hub-central-entity-model-reader", "hub-central-entity-model-writer", "hub-central-saved-query-user").withRequest();
    cy.waitForAsyncRequest();
  });
  afterEach(() => {
    cy.resetTestUser();
    cy.waitForAsyncRequest();
  });
  after(() => {
    cy.loginAsDeveloper().withRequest();
    cy.deleteEntities("Patient");
    cy.resetTestUser();
    cy.waitForAsyncRequest();
  });
  it("Create an entity with property that already exists", () => {
    cy.waitUntil(() => toolbar.getModelToolbarIcon()).click();
    entityTypeTable.waitForTableToLoad();
    cy.waitUntil(() => modelPage.getAddEntityButton()).click();
    entityTypeModal.newEntityName("User3");
    entityTypeModal.newEntityDescription("An entity for User");
    entityTypeModal.getAddButton().click();
    propertyTable.getAddPropertyButton("User3").click();
    propertyModal.newPropertyName("Address");
    propertyModal.openPropertyDropdown();
    propertyModal.getTypeFromDropdown("Structured").click();
    propertyModal.getCascadedTypeFromDropdown("New Property Type").click();
    structuredTypeModal.newName("Address");
    structuredTypeModal.getAddButton().click();
    propertyModal.getYesRadio("multiple").click();
    propertyModal.getSubmitButton().click();
    cy.contains("A property already exists with a name of Address");
    propertyModal.clearPropertyName();
    propertyModal.newPropertyName("address");
    propertyModal.getSubmitButton().click();
    propertyTable.getMultipleIcon("address").should("exist");
  });
  it("Add basic property to structured type", () => {
    propertyTable.getAddPropertyToStructureType("Address").should("be.visible").click();
    propertyModal.getStructuredTypeName().should("have.text", "Address");
    propertyModal.newPropertyName("street");
    propertyModal.openPropertyDropdown();
    propertyModal.getTypeFromDropdown("More date types").click();
    propertyModal.getCascadedTypeFromDropdown("gDay").click();
    propertyModal.getNoRadio("multiple").click();
    propertyModal.getYesRadio("pii").click();
    //propertyModal.clickCheckbox('wildcard');
    propertyModal.getSubmitButton().click();
    propertyTable.getMultipleIcon("street").should("not.exist");
    propertyTable.getPiiIcon("street").should("exist");
    //propertyTable.getWildcardIcon('street').should('exist');
  });
  it("Add structured property to structured type", () => {
    propertyTable.getAddPropertyToStructureType("Address").click();
    propertyModal.newPropertyName("zip");
    propertyModal.openPropertyDropdown();
    propertyModal.getTypeFromDropdown("Structured").click();
    propertyModal.getCascadedTypeFromDropdown("New Property Type").click();
    structuredTypeModal.newName("street");
    structuredTypeModal.getAddButton().click();
    cy.contains("A property type already exists with a name of street");
    structuredTypeModal.clearName();
    structuredTypeModal.newName("Zip");
    structuredTypeModal.getAddButton().click();
    propertyModal.getYesRadio("multiple").click();
    propertyModal.getNoRadio("pii").click();
    propertyModal.getSubmitButton().click();
    propertyTable.getMultipleIcon("zip").should("exist");
    propertyTable.getPiiIcon("zip").should("not.exist");
    //propertyTable.getWildcardIcon('zip').should('not.exist');
  });
  it("Add properties to nested structured type", () => {
    propertyTable.getAddPropertyToStructureType("Zip").click();
    propertyModal.getStructuredTypeName().should("have.text", "Address.Zip");
    propertyModal.newPropertyName("fiveDigit");
    propertyModal.openPropertyDropdown();
    propertyModal.getTypeFromDropdown("More number types").click();
    propertyModal.getCascadedTypeFromDropdown("int").click();
    propertyModal.getSubmitButton().click();
    propertyTable.getMultipleIcon("code").should("not.exist");
    propertyTable.getPiiIcon("code").should("not.exist");
    //propertyTable.getWildcardIcon('code').should('not.exist');
  });
  it("Test for additional nesting of structured types", () => {
    propertyTable.getAddPropertyToStructureType("Zip").click();
    propertyModal.newPropertyName("extra");
    propertyModal.openPropertyDropdown();
    propertyModal.getTypeFromDropdown("Structured").click();
    propertyModal.getCascadedTypeFromDropdown("New Property Type").click();
    structuredTypeModal.newName("Extra");
    structuredTypeModal.getAddButton().click();
    propertyModal.getSubmitButton().click();
    propertyTable.getAddPropertyToStructureType("Extra").click();
    propertyModal.newPropertyName("fourDigit");
    propertyModal.openPropertyDropdown();
    propertyModal.getTypeFromDropdown("integer").click();
    propertyModal.getYesRadio("pii").click();
    //propertyModal.clickCheckbox('wildcard');
    propertyModal.getSubmitButton().click();
    propertyTable.expandStructuredTypeIcon("extra").click();
    propertyTable.getMultipleIcon("fourDigit").should("not.exist");
    propertyTable.getPiiIcon("fourDigit").should("exist");
    //propertyTable.getWildcardIcon('fourDigit').should('exist');
  });
  it("Edit Property Structured Property", () => {
    propertyTable.editProperty("street");
    propertyModal.getToggleStepsButton().should("not.exist");
    propertyModal.clearPropertyName();
    propertyModal.newPropertyName("Zip");
    propertyModal.getSubmitButton().click();
    cy.contains(`A property already exists with a name of Zip`).should("be.visible");
    propertyModal.clearPropertyName();
    propertyModal.newPropertyName("streetAlt");
    propertyModal.clearPropertyDropdown();
    propertyModal.openPropertyDropdown();
    propertyModal.getTypeFromDropdown("More number types").click();
    propertyModal.getCascadedTypeFromDropdown("unsignedByte").click();
    propertyModal.getYesRadio("idenifier").should("not.exist");
    propertyModal.getYesRadio("multiple").click();
    propertyModal.getNoRadio("pii").click();
    //propertyModal.clickCheckbox('wildcard');
    propertyModal.getSubmitButton().click();
    propertyTable.getMultipleIcon("streetAlt").should("exist");
    propertyTable.getPiiIcon("streetAlt").should("not.exist");
    //propertyTable.getWildcardIcon('streetAlt').should('exist');
  });
  it("Rename property and change type from structured to relationship", () => {
    propertyTable.editProperty("address");
    propertyModal.clearPropertyName();
    propertyModal.newPropertyName("alt_address");
    propertyModal.openPropertyDropdown();
    propertyModal.getTypeFromDropdown("Related Entity").click();
    propertyModal.getCascadedTypeFromDropdown("Person").click();
    propertyModal.openJoinPropertyDropdown();
    propertyModal.getJoinProperty("Address").click();
    propertyModal.getYesRadio("multiple").click();
    propertyModal.getYesRadio("idenifier").should("not.exist");
    propertyModal.getYesRadio("pii").should("not.exist");
    //propertyModal.getCheckbox('wildcard').should('not.exist');
    propertyModal.getSubmitButton().click();
    propertyTable.getMultipleIcon("alt_address").should("exist");
    propertyTable.getIdentifierIcon("alt_address").should("not.exist");
    propertyTable.getPiiIcon("alt_address").should("not.exist");
  });
  it("Change relationship property to structured", () => {
    propertyTable.editProperty("alt_address");
    propertyModal.getToggleStepsButton().should("not.exist");
    propertyModal.clearPropertyDropdown();
    propertyModal.openPropertyDropdown();
    propertyModal.getTypeFromDropdown("Structured").click();
    propertyModal.getCascadedTypeFromDropdown("Address").click();
    propertyModal.getSubmitButton().click();
    propertyTable.expandStructuredTypeIcon("alt_address").click();
    propertyTable.getProperty("streetAlt").should("exist");
  });
  it("Add join property with type as Related Entity", () => {
    propertyTable.getAddPropertyButton("User3").click();
    propertyModal.newPropertyName("OrderedBy");
    propertyModal.getJoinPropertyDropdown().should("not.exist");
    propertyModal.openPropertyDropdown();
    propertyModal.getTypeFromDropdown("Related Entity").click();
    propertyModal.getCascadedTypeFromDropdown("Customer").click();
    propertyModal.openJoinPropertyDropdown();
    propertyModal.getJoinProperty("nicknames").should("not.be.enabled");
    propertyModal.getJoinProperty("customerId").click();
    propertyModal.getSubmitButton().click();
    propertyTable.getProperty("OrderedBy").should("exist");
  });
  it("Delete a property, a structured property and then the entity", () => {
    //Structured Property
    propertyTable.getDeleteStructuredPropertyIcon("User3", "Address", "streetAlt").click();
    confirmationModal.getDeletePropertyWarnText().should("exist");
    confirmationModal.getYesButton(ConfirmationType.DeletePropertyWarn).click();
    propertyTable.getProperty("streetAlt").should("not.exist");
    //Property
    propertyTable.getDeletePropertyIcon("User3", "alt_address").click();
    confirmationModal.getDeletePropertyWarnText().should("exist");
    confirmationModal.getYesButton(ConfirmationType.DeletePropertyWarn).click();
    propertyTable.getProperty("alt_address").should("not.exist");
    propertyTable.getDeletePropertyIcon("User3", "OrderedBy").click();
    confirmationModal.getDeletePropertyWarnText().should("exist");
    confirmationModal.getYesButton(ConfirmationType.DeletePropertyWarn).click();
    propertyTable.getProperty("OrderedBy").should("not.exist");
    entityTypeTable.getSaveEntityIcon("User3").click();
    confirmationModal.getSaveEntityText().should("be.visible");
    confirmationModal.getYesButton(ConfirmationType.SaveEntity).click();
    cy.waitForAsyncRequest();
    confirmationModal.getSaveEntityText().should("exist");
    confirmationModal.getSaveEntityText().should("not.exist");
    //Entity
    entityTypeTable.getDeleteEntityIcon("User3").click();
    confirmationModal.getDeleteEntityText().should("be.visible");
    confirmationModal.getYesButton(ConfirmationType.DeleteEntity).click();
    confirmationModal.getDeleteEntityText().should("exist");
    confirmationModal.getDeleteEntityText().should("not.exist");
    entityTypeTable.getEntity("User3").should("not.exist");
  });
  it("Adding property to Order entity", () => {
    entityTypeTable.getExpandEntityIcon("Order").click();
    propertyTable.getAddPropertyButton("Order").click();
    propertyModal.newPropertyName("orderID");
    propertyModal.openPropertyDropdown();
    propertyModal.getTypeFromDropdown("string").click();
    propertyModal.getNoRadio("identifier").click();
    propertyModal.getYesRadio("multiple").click();
    propertyModal.getYesRadio("pii").click();
    //propertyModal.clickCheckbox('wildcard');
    propertyModal.getSubmitButton().click();
    propertyTable.getMultipleIcon("orderID").should("exist");
    propertyTable.getPiiIcon("orderID").should("exist");
    //propertyTable.getWildcardIcon('orderID').should('exist');
    modelPage.getEntityModifiedAlert().should("exist");
  });
  it("Adding property to Person entity", () => {
    entityTypeTable.getExpandEntityIcon("Person").click();
    propertyTable.getAddPropertyButton("Person").click();
    propertyModal.newPropertyName("personID");
    propertyModal.openPropertyDropdown();
    propertyModal.getTypeFromDropdown("string").click();
    propertyModal.getNoRadio("identifier").click();
    propertyModal.getYesRadio("multiple").click();
    propertyModal.getYesRadio("pii").click();
    //propertyModal.clickCheckbox('wildcard');
    propertyModal.getSubmitButton().click();
    propertyTable.getMultipleIcon("personID").should("exist");
    propertyTable.getPiiIcon("personID").should("exist");
    //propertyTable.getWildcardIcon('personID').should('exist');
  });
  it("Revert all the changes", () => {
    modelPage.getRevertAllButton().should("exist").click();
    confirmationModal.getYesButton(ConfirmationType.RevertAll).click();
    confirmationModal.getRevertAllEntityText().should("not.exist");
    propertyTable.getMultipleIcon("personID").should("not.exist");
    propertyTable.getPiiIcon("personID").should("not.exist");
    //propertyTable.getWildcardIcon('personID').should('not.exist');
    propertyTable.getMultipleIcon("orderID").should("not.exist");
    propertyTable.getPiiIcon("orderID").should("not.exist");
    //propertyTable.getWildcardIcon('orderID').should('not.exist');
    modelPage.getEntityModifiedAlert().should("not.exist");
  });
  it("Create Concept entity and add a property", () => {
    modelPage.getAddEntityButton().should("exist").click();
    entityTypeModal.newEntityName("Concept");
    entityTypeModal.newEntityDescription("A concept entity");
    entityTypeModal.getAddButton().click();
    propertyTable.getAddPropertyButton("Concept").click();
    propertyModal.newPropertyName("order");
    propertyModal.openPropertyDropdown();
    propertyModal.getTypeFromDropdown("Related Entity").click();
    propertyModal.getCascadedTypeFromDropdown("Order").click();
    propertyModal.openJoinPropertyDropdown();
    propertyModal.getJoinProperty("orderId").click();
    propertyModal.getYesRadio("multiple").click();
    propertyModal.getSubmitButton().click();
    propertyTable.getMultipleIcon("order").should("exist");
  });
  it("Add another property to Concept Entity and delete it", () => {
    propertyTable.getAddPropertyButton("Concept").click();
    propertyModal.newPropertyName("testing");
    propertyModal.openPropertyDropdown();
    propertyModal.getTypeFromDropdown("More date types").click();
    propertyModal.getCascadedTypeFromDropdown("yearMonthDuration").click();
    propertyModal.getSubmitButton().click();
    propertyTable.getDeletePropertyIcon("Concept", "testing").should("exist").click();
    confirmationModal.getDeletePropertyWarnText().should("exist");
    confirmationModal.getYesButton(ConfirmationType.DeletePropertyWarn).click();
    propertyTable.getProperty("testing").should("not.exist");
    modelPage.getEntityModifiedAlert().should("exist");
  });
  it("Create another entity Patient and add a property", () => {
    modelPage.getAddEntityButton().should("exist").click();
    entityTypeModal.newEntityName("Patient");
    entityTypeModal.newEntityDescription("An entity for patients");
    entityTypeModal.getAddButton().click();
    propertyTable.getAddPropertyButton("Patient").should("be.visible").click();
    propertyModal.newPropertyName("patientID");
    propertyModal.openPropertyDropdown();
    propertyModal.getTypeFromDropdown("More number types").click();
    propertyModal.getCascadedTypeFromDropdown("byte").click();
    propertyModal.getYesRadio("identifier").click();
    //propertyModal.clickCheckbox('wildcard');
    propertyModal.getSubmitButton().click();
    propertyTable.getIdentifierIcon("patientID").should("exist");
    //propertyTable.getWildcardIcon('patientID').should('exist');
    propertyTable.getAddPropertyButton("Patient").should("exist");
    propertyTable.getAddPropertyButton("Patient").click();
    propertyModal.newPropertyName("personType");
    propertyModal.openPropertyDropdown();
    propertyModal.getTypeFromDropdown("Related Entity").click();
    propertyModal.getCascadedTypeFromDropdown("Person").click();
    propertyModal.openJoinPropertyDropdown();
    propertyModal.getJoinProperty("id").click();
    propertyModal.getSubmitButton().click();
    propertyTable.getProperty("personType").should("exist");
  });
  it("Add second property to Patient Entity and delete it", () => {
    propertyTable.getAddPropertyButton("Patient").click();
    propertyModal.newPropertyName("patientId");
    propertyModal.openPropertyDropdown();
    propertyModal.getTypeFromDropdown("More number types").click();
    propertyModal.getCascadedTypeFromDropdown("byte").click();
    propertyModal.getSubmitButton().click();
    propertyTable.editProperty("patientId");
    propertyModal.getDeleteIcon("patientId").click();
    confirmationModal.getDeletePropertyWarnText().should("exist");
    confirmationModal.getYesButton(ConfirmationType.DeletePropertyWarn).click();
    propertyTable.getProperty("patientId").should("not.exist");
  });
  it("Add third property to Patient Entity , Save all the changes and Delete Concept Entity", () => {
    propertyTable.getAddPropertyButton("Patient").click();
    propertyModal.newPropertyName("health");
    propertyModal.openPropertyDropdown();
    propertyModal.getTypeFromDropdown("More number types").click();
    propertyModal.getCascadedTypeFromDropdown("negativeInteger").click();
    propertyModal.clickCheckbox("facetable");
    propertyModal.clickCheckbox("sortable");
    propertyModal.getSubmitButton().click();
    propertyTable.getProperty("health").should("exist");
    propertyTable.getFacetIcon("health").should("exist");
    propertyTable.getSortIcon("health").should("exist");
    //Save Changes
    modelPage.getSaveAllButton().click();
    confirmationModal.getYesButton(ConfirmationType.SaveAll).click();
    cy.waitForAsyncRequest();
    confirmationModal.getSaveAllEntityText().should("exist");
    confirmationModal.getSaveAllEntityText().should("not.exist");
    modelPage.getEntityModifiedAlert().should("not.exist");
    propertyTable.getProperty("patientId").should("not.exist");
    propertyTable.getProperty("health").should("exist");
    propertyTable.getFacetIcon("health").should("exist");
    propertyTable.getSortIcon("health").should("exist");
    //Delete Entity
    entityTypeTable.getDeleteEntityIcon("Concept").click();
    confirmationModal.getYesButton(ConfirmationType.DeleteEntity).click();
    confirmationModal.getDeleteEntityRelationshipText().should("not.exist");
    entityTypeTable.getEntity("Concept").should("not.exist");
  });
});

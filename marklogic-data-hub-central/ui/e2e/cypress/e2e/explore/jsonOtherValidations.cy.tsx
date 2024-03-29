import {BaseEntityTypes} from "../../support/types/base-entity-types";
import entitiesSidebar from "../../support/pages/entitiesSidebar";
import browsePage from "../../support/pages/browse";
import runPage from "../../support/pages/run";
import "cypress-wait-until";


describe("Verify numeric/date facet can be applied", () => {
  before(() => {
    cy.loginAsTestUserWithRoles("pii-reader", "hub-central-developer").withRequest();
    browsePage.navigate();
  });

  after(() => {
    cy.resetTestUser();
  });

  it("Apply numeric facet values multiple times, clears the previous values and applies the new one", () => {
    browsePage.switchToTableView();
    entitiesSidebar.clearAllFacetsApplied();
    entitiesSidebar.openBaseEntityDropdown();
    entitiesSidebar.selectBaseEntityOption("All Entities");
    browsePage.waitForHCTableToLoad();
    entitiesSidebar.openBaseEntityDropdown();
    entitiesSidebar.selectBaseEntityOption("Customer");
    entitiesSidebar.getBaseEntityOption("Customer").should("be.visible");
    browsePage.waitForSpinnerToDisappear();
    entitiesSidebar.openBaseEntityFacets(BaseEntityTypes.CUSTOMER);
    browsePage.changeNumericSlider("2273");
    browsePage.getGreyRangeFacet(2273).should("exist");
    browsePage.getFacetApplyButton().click();
    browsePage.getRangeFacet(2273).should("exist");
    browsePage.getClearAllFacetsButton().should("exist");
    browsePage.changeNumericSlider("3024");
    browsePage.getGreyRangeFacet(3024).should("exist");
    browsePage.getFacetApplyButton().should("exist");
    browsePage.getFacetApplyButton().click();
    browsePage.getRangeFacet(3024).should("exist");
  });

  it("Verify clearing date range facet clears corresponding selected facet", () => {
    browsePage.getClearAllFacetsButton().should("exist");
    browsePage.getClearAllFacetsButton().click();
    browsePage.selectDateRange();
    browsePage.getFacetApplyButton().click();
    browsePage.getSelectedFacet("birthDate:").should("exist");
    browsePage.getDateFacetPicker().trigger("mouseover");
    browsePage.getDateFacetClearIcon().click({force: true});
    browsePage.getFacetApplyButton().should("not.exist");
  });

  it("Verify functionality of clear and apply facet buttons", () => {
    cy.log("**Go to explore page and click on table view**");
    cy.visit("tiles-explore");
    cy.waitForAsyncRequest();
    browsePage.waitForSpinnerToDisappear();
    browsePage.switchToTableView();

    cy.log("**verify no facets selected case.**");
    entitiesSidebar.openBaseEntityDropdown();
    entitiesSidebar.selectBaseEntityOption("Customer");
    browsePage.getClearAllFacetsButton().should("be.disabled");
    entitiesSidebar.applyFacetsButton.should("be.disabled");

    entitiesSidebar.openBaseEntityFacets(BaseEntityTypes.CUSTOMER);
    browsePage.getFacetItemCheckbox("name", "Adams Cole").click();
    browsePage.getGreySelectedFacets("Adams Cole").should("exist");
    browsePage.getClearAllFacetsButton().should("not.be.disabled");
    entitiesSidebar.applyFacetsButton.should("not.be.disabled");

    entitiesSidebar.applyFacets();
    browsePage.getFacetItemCheckbox("name", "Adams Cole").should("be.checked");
    browsePage.getAppliedFacets("Adams Cole").should("exist");
    browsePage.getClearAllFacetsButton().should("not.be.disabled");
    entitiesSidebar.applyFacetsButton.should("be.disabled");

    browsePage.getFacetItemCheckbox("email", "adamscole@nutralab.com").click();
    browsePage.getGreySelectedFacets("adamscole@nutralab.com").should("exist");
    browsePage.getClearAllFacetsButton().should("not.be.disabled");
    entitiesSidebar.applyFacetsButton.should("not.be.disabled");
    browsePage.getClearAllFacetsButton().click();
    browsePage.getAppliedFacets("Adams Cole").should("not.exist");
    browsePage.getFacetItemCheckbox("name", "Adams Cole").should("not.be.checked");
    browsePage.getClearAllFacetsButton().should("be.disabled");
    entitiesSidebar.applyFacetsButton.should("be.disabled");
  });

  it("Verify gray facets don't persist when switching between browse, zero state explorer and run views", {defaultCommandTimeout: 120000}, () => {
    cy.log("**Return to main sidebar");
    entitiesSidebar.backToMainSidebar();

    cy.log("**Remove Customer entity and select Person entity to facet");
    entitiesSidebar.removeSelectedBaseEntity();
    entitiesSidebar.selectBaseEntityOption("Person");
    entitiesSidebar.openBaseEntityFacets(BaseEntityTypes.PERSON);
    browsePage.clickMoreLink("fname");
    browsePage.getFacetItemCheckbox("fname", "Alexandra").click();
    browsePage.getGreySelectedFacets("Alexandra").should("exist");
    browsePage.navigate();
    browsePage.switchToSnippetView();
    browsePage.getGreySelectedFacets("Alexandra").should("not.exist");
    cy.log("**verify gray facets don't persist when switching between browse and run views.**");
    entitiesSidebar.openBaseEntityDropdown();
    entitiesSidebar.selectBaseEntityOption("Person");
    entitiesSidebar.openBaseEntityFacets(BaseEntityTypes.PERSON);
    browsePage.clickMoreLink("fname");
    browsePage.getFacetItemCheckbox("fname", "Alexandra").click();
    browsePage.getGreySelectedFacets("Alexandra").should("exist");
    runPage.navigate();
    runPage.getFlowName("personJSON").should("be.visible");
    runPage.expandFlow("personJSON");
    runPage.runStep("mapPersonJSON", "personJSON");
    runPage.verifyStepRunResult("mapPersonJSON", "success");
    runPage.explorerLink("mapPersonJSON").click();
    browsePage.waitForSpinnerToDisappear();
    browsePage.waitForHCTableToLoad();
    browsePage.getGreySelectedFacets("Alexandra").should("not.exist");
  });

  it("Verify clearing date time range facet clears corresponding selected facet", () => {
    browsePage.navigate();
    cy.wait(1000);
    entitiesSidebar.removeSelectedBaseEntity();
    entitiesSidebar.selectBaseEntityOption("Client");
    entitiesSidebar.openBaseEntityFacets(BaseEntityTypes.CLIENT);
    browsePage.selectDateRange({time: "updated"});
    browsePage.getFacetApplyButton().click();
    browsePage.getSelectedFacet("updated:").should("exist");
    browsePage.getDateFacetPicker({time: "updated"}).trigger("mouseover");
    browsePage.getDateFacetClearIcon({time: "updated"}).click({force: true});
    browsePage.getFacetApplyButton().should("not.exist");
  });
});

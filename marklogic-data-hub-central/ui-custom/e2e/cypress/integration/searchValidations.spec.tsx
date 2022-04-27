import landingPage from "../support/pages/landing";
import searchPage from "../support/pages/search";

let searchPerson="";
let searchAddress="";
let searchPhone="";
let searchEmail="";
let searchSources="";
let searchStatus="";
let searchCountries="";

describe("Search Validations ", () => {
  beforeEach(() => {
    cy.restoreLocalStorage();
    cy.intercept("/api/explore**").as("getSearch");
  });
  afterEach(() => {
    cy.saveLocalStorage();
  });
  it("Visit Entity Viewer Application ", () => {
    cy.visit("/");
    landingPage.whatsNewChart().should("be.visible");
  });
  it("Click on serach button for navigating to search page and get search values", () => {
    searchPage.searchButton().click();
    searchPage.resultsList().should("be.visible");
    searchPage.resultTitle().eq(0).then(nameVal => {
      searchPerson = nameVal.text();
    });
    searchPage.resultAddress().eq(0).then(addressVal => {
      searchAddress = addressVal.text();
    });
    searchPage.resultPhone().eq(0).then(phoneVal => {
      searchPhone = phoneVal.text();
    });
    searchPage.resultEmail().eq(0).then(emailVal => {
      searchEmail = emailVal.text();
    });
    searchPage.getFacetLabel(2, 0).then(sourcesVal => {
      searchSources = sourcesVal.text();
    });
    searchPage.getFacetLabel(3, 0).then(statusVal => {
      searchStatus = statusVal.text();
    });
    searchPage.getFacetLabel(4, 0).then(countriesVal => {
      searchCountries = countriesVal.text();
    });
    searchPage.getIcon(0).should("be.visible");
  });
  it("Search values at header ", () => {
    searchPage.menuSearchBox().clear().type(searchPerson).type("{enter}");
    cy.wait("@getSearch");
    searchPage.resultTitle().eq(0).then(nameVal => {
      expect(nameVal.text()).to.equal(searchPerson);
    });
    searchPage.menuSearchBox().clear().type(searchAddress).type("{enter}");
    cy.wait("@getSearch");
    searchPage.resultAddress().eq(0).then(addressVal => {
      expect(addressVal.text()).to.equal(searchAddress);
    });
    searchPage.menuSearchBox().clear().type(searchPhone).type("{enter}");
    cy.wait("@getSearch");
    searchPage.resultPhone().eq(0).then(phoneVal => {
      expect(phoneVal.text()).to.equal(searchPhone);
    });
    searchPage.menuSearchBox().clear().type(searchEmail).type("{enter}");
    cy.wait("@getSearch");
    searchPage.resultEmail().eq(0).then(emailVal => {
      expect(emailVal.text()).to.equal(searchEmail);
    });
    searchPage.menuSearchBox().clear().type(searchSources).type("{enter}");
    cy.wait("@getSearch");
    searchPage.resultCategories().eq(0).then(sourceVal => {
      expect(sourceVal.text()).to.contain(searchSources);
    });
    searchPage.menuSearchBox().clear().type(searchStatus).type("{enter}");
    cy.wait("@getSearch");
    searchPage.resultStatus().eq(0).then(statusVal => {
      expect(statusVal.text()).to.equal(searchStatus);
    });
    searchPage.menuSearchBox().clear().type(searchCountries).type("{enter}");
    cy.wait("@getSearch");
    searchPage.resultTitle().eq(0).click({force: true});
    cy.contains(searchCountries).should("be.visible");
  });
  it("Search values from landing page ", () => {
    landingPage.entityViewerTitle().click();
    landingPage.dashboard().should("be.visible");
    landingPage.searchBox().clear().type(searchPerson.split(" ")[0]).type("{enter}");
    cy.wait("@getSearch");
    searchPage.resultTitle().eq(0).then(nameVal => {
      expect(nameVal.text()).to.equal(searchPerson);
    });
    searchPage.menuSearchBox().should("have.value", searchPerson.split(" ")[0]);
    landingPage.entityViewerTitle().click();
    landingPage.dashboard().should("be.visible");
    landingPage.searchBox().clear().type(searchAddress.split(",")[0]).type("{enter}");
    cy.wait("@getSearch");
    searchPage.resultAddress().eq(0).then(addressVal => {
      expect(addressVal.text()).to.equal(searchAddress);
    });
    landingPage.entityViewerTitle().click();
    landingPage.dashboard().should("be.visible");
    landingPage.searchBox().clear().type(searchPhone.split("-")[2]).type("{enter}");
    cy.wait("@getSearch");
    searchPage.resultPhone().eq(0).then(phoneVal => {
      expect(phoneVal.text()).to.equal(searchPhone);
    });
    landingPage.entityViewerTitle().click();
    landingPage.dashboard().should("be.visible");
    landingPage.searchBox().clear().type(searchEmail.split("@")[0]).type("{enter}");
    cy.wait("@getSearch");
    searchPage.resultEmail().eq(0).then(emailVal => {
      expect(emailVal.text()).to.equal(searchEmail);
    });
    landingPage.entityViewerTitle().click();
    landingPage.dashboard().should("be.visible");
    landingPage.searchBox().clear().type(searchSources).type("{enter}");
    cy.wait("@getSearch");
    searchPage.resultCategories().eq(0).then(sourceVal => {
      expect(sourceVal.text()).to.contain(searchSources);
    });
    landingPage.entityViewerTitle().click();
    landingPage.dashboard().should("be.visible");
    landingPage.searchBox().clear().type(searchStatus).type("{enter}");
    cy.wait("@getSearch");
    searchPage.resultStatus().eq(0).then(statusVal => {
      expect(statusVal.text()).to.equal(searchStatus);
    });
    landingPage.entityViewerTitle().click();
    landingPage.dashboard().should("be.visible");
    landingPage.searchBox().clear().type(searchCountries).type("{enter}");
    cy.wait("@getSearch");
    searchPage.resultTitle().eq(0).click({force: true});
    cy.contains(searchCountries).should("be.visible");
  });
});

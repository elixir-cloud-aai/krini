describe("auth", () => {
  it("user can login", () => {
    cy.visit("/");
    cy.contains("Login").click();
    cy.origin("https://ds.aai.lifescience-ri.eu", () => {
      cy.contains("Login with LS username").click();
      cy.get("#username").type("test"); // Some test username
      cy.get("#password").type("test"); // Some test password
      cy.get('button[type="submit"]').click();
    });
    // cy.contains("Run workflows");
  });
});

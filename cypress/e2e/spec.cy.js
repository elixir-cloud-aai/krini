describe("auth", () => {
  it("user can login", () => {
    cy.once("uncaught:exception", () => false);
    cy.visit("/");
    cy.wait(3000).then(() => {
      cy.get("html").then(($html) => {
        if ($html.find("#cm").length > 0) cy.contains("Accept all").click();
        else console.log("No cookie banner or cookie already accepted");
      });

      cy.contains("Login").click();
      cy.origin("https://elixir-czech.org", () => {});
      cy.origin("https://ds.aai.lifescience-ri.eu", () => {
        cy.wait(3000).then(() => {
          cy.get("html").then(($html) => {
            if ($html.find("LifeScience Hostel").length > 0) {
              cy.contains("LifeScience Hostel").click({ force: true });
            } else cy.contains("Login with LS username").click({ force: true });
          });
          cy.get("#username").type("test"); // Some test username
          cy.get("#password").type("test"); // Some test password
          // cy.get('button[type="submit"]').click();
        });
      });
      cy.once("uncaught:exception", () => false);
      cy.origin(
        "https://hostel.aai.lifescience-ri.eu/lshostel/module.php/core",
        () => {
          cy.get('button[type="submit"]').click();
        }
      );
      // cy.contains("Run workflows");
    });
  });
});

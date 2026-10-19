---
name: playwright-ui-test
description: UI testing with playwright with Page object model (POM)
---

## Workflow
1. Analyze the UI and identify the elements that need to be tested.
2. Create page object classes for each page or component, defining methods to interact with the elements. And use data-testid attributes for selecting elements.
3. Write test cases using the page object methods to perform actions and assertions.
4. Organize tests and page objects by feature to maintain a clear structure.
5. Run the tests and review the results to ensure the UI behaves as expected.
   * If tests fail, investigate the cause, update the page objects or test cases as needed, and re-run the tests.


## Project structure with Page Object Model (POM) and feature-based organization
```
tests/
  feature-name/
    feature-name.success.spec.ts
    feature-name.failure.spec.ts
  pages/
    feature-name/
      feature-name.page.ts
playwright.config.ts
```

## Best practices
* Do not change code of target test system; only interact with it through the UI as a user would.
* Use the Page Object Model (POM) to separate test logic from page structure and interactions.
* Use test identifiers (data-testid) in your HTML elements to make selectors more robust and less prone to breaking due to UI changes.
* Organize tests and page objects by feature to improve maintainability and readability.
* Name test files with `.success.spec.ts` and `.failure.spec.ts` to clearly indicate the expected outcome.
* Keep page object classes focused on a single page or component to adhere to the single responsibility principle.
* Avoid hardcoding selectors in tests; always use the page object methods to interact with the page.
* Keep test cases independent and idempotent to ensure reliable test execution.
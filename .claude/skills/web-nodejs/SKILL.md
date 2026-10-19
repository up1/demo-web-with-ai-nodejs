---
name: web-nodejs
description: Develop web applications using Node.js, EJS templates, and sqlite database
---

## Workflow
1. Analyze and planning (work-breakdown) from user's requirements
2. Design web application's views from User Interface (UI) requirements (HTML with EJS templates)
3. Implement web application logic using Node.js, EJS templates, and sqlite database follow from the designed views and user requirements 
4. Following project structure and best practices for web application development, including security, performance, and maintainability
5. Check user interface with mockup ui with `playwright mcp`
   * If not matching the mockup, iterate and refine the UI until it aligns with the design

## Technologies stack

- Node.js
- EJS templates
- sqlite database (built-in NodeJS module), Don't use external database drivers

## Project Structure with feature modules
```
web/
  ├─ features/
  │  ├─ feature1/
  │  │  ├─ controller.js
  │  │  ├─ model.js
  │  │  └─ view.ejs
  │  │  ├─ routes.js
  │  │  ├─ repository.js
  │  │  └─ service.js
  ├─ views/
    ├─ layout.ejs
    └─ partials/
       ├─ header.ejs
       └─ footer.ejs
  ├─ public/
  ├─ app.js
  └─ package.json
```

## Best Practices

- Follow the MVC (Model-View-Controller) pattern for organizing code within feature modules
- Keep business logic in services and data access logic in repositories
- Use EJS partials for reusable UI components
- Validate user input and handle errors gracefully
- Ensure to generate `data-testid` for all testable components within the application
- Ensure security best practices, such as preventing SQL injection and XSS attacks
- Optimize performance by minimizing database queries and using caching where appropriate
- Write maintainable and well-documented code
- Follow consistent coding conventions and style throughout the project
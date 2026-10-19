# Feature : Add New User

## User Interface
* Read from file @ `requirement/add_new_user/mock_ui.html`

## User flow
* User navigates to the "Add New User" page with route `/add-new-user`.
* System generates employee ID with format (YYYY-running number), e.g., 2026-001.
* User must fill in the required fields (e.g. first name, last name, email, password).
* User should choose a role from the available role template (e.g., Super Admin, Department Manager).
* User should choose scope of access (e.g., self only, department or all users).
* User clicks the "Create User" button.
* System validates the input and displays success or error messages accordingly.


## Input validations in table format

| Field | Validation | Error message |
|-------|------------|----------------|
| ชื่อ | Required, max length 50 characters | Please enter your first name |
| นามสกุล | Required, max length 50 characters | Please enter your last name |
| First Name | Required, max length 50 characters | Please enter your first name |
| Last Name | Required, max length 50 characters | Please enter your last name |
| Email | Required, valid email format | Please enter a valid email address |
| Password | Required and strong, min length 8 characters, must include letters, numbers, and special characters | Please enter a strong password |
| Role | Required, must be one of the available role templates | Please select a role |
| Scope of Access | Required, must be one of the available options (self only, department, all users) | Please select the scope of access |
| Employee ID | Required, must follow the format (YYYY-running number) | Please enter a valid employee ID |

## Web element with data_testid

| Field | Data Test ID |
|-------|--------------|
| Employee ID | input-employee-id |
| Thai first name | input-thai-first-name |
| Thai last name | input-thai-last-name |
| First Name | input-first-name |
| Last Name | input-last-name |
| Email | input-email |
| Password | input-password |
| Role | select-role |
| Scope of Access | select-scope-of-access |
| Create User Button | button-create-user |
| Job Title | input-job-title |
| Department | input-department |

## Test cases

### Add New User Successfully with valid input

**Preconditions:**
* User is logged in with appropriate permissions to add a new user.

**Test Steps:**
1. Navigate to the "Add New User" page with route `/add-new-user`.
2. Fill in the required fields with valid input
3. Select a role from the available role template.
4. Select the scope of access.
5. Click the "Create User" button.

Example of valid input:
| Field | Value |
|-------|-------|
| Thai first name | สมชาย |
| Thai last name | ใจดี |
| First Name | Somchai |
| Last Name | Jaidee |
| Email | somchai.jaidee@example.com |
| Password | StrongP@ssw0rd |
| Role | Super Admin |
| Scope of Access | Self only |
| Job Title | Software Engineer |
| Department | IT |

**Expected Result:**
* System validates the input and displays a success message.
* The new user is added to the system with the generated employee ID.
* Redirects to the user list page.

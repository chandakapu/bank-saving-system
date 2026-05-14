# Bank Saving System

A full-stack application for managing bank customers, deposit accounts, and interest-bearing withdrawals.

## Quick Start (with Docker)

The easiest way to run the entire system (Frontend, Backend, and MySQL) is using Docker Compose.

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd bank-saving-system
    ```

2.  **Start the services**:
    ```bash
    docker-compose up --build
    ```

3.  **Access the application**:
    - **Frontend**: [http://localhost](http://localhost)
    - **Backend API**: [http://localhost:3000/api/v1](http://localhost:3000/api/v1)
    - **MySQL**: `localhost:3307` (User: `root`, Pass: `root`)

---

## Live Deployment

The application has been deployed using free hosting services:
- **Frontend**: [Vercel](https://vercel.com/)
- **Backend API**: [Render](https://render.com/)
- **Database**: [TiDB](https://en.pingcap.com/tidb-serverless/)

---

## System Specifications & Design

All required technical documentation, mockups, and diagrams can be found in the [`docs/`](docs/) directory:

- **Mockup / Wireframes / UI Framework:** Interactive HTML/CSS wireframes demonstrating the user interface are available in [`docs/wireframes.html`](docs/wireframes.html).
- **User Journey & Flow:**
  - The UI flows (navigation, opening accounts, transactions) are visually implemented in the wireframes.
  - The complex backend sequence and API call flow (especially for withdrawals and interest calculation) is detailed in [`docs/SEQUENCE_DIAGRAM.md`](docs/SEQUENCE_DIAGRAM.md).
- **Database Design & ERD:** Detailed in [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) and [`docs/ERD.md`](docs/ERD.md).
- **API Specs & Error Handling:** Available in [`docs/API_SPEC.md`](docs/API_SPEC.md) and [`docs/ERROR_HANDLING.md`](docs/ERROR_HANDLING.md). (A Postman collection is also provided in the `postman/` directory).
- **UML Diagrams:** Class and Use Case diagrams are available in [`docs/CLASS_DIAGRAM.md`](docs/CLASS_DIAGRAM.md) and [`docs/USE_CASE_DIAGRAM.md`](docs/USE_CASE_DIAGRAM.md).

---

## Architecture

-   **Frontend**: React (Vite) + Tailwind CSS
-   **Backend**: Node.js + Express
-   **Database**: MySQL 8.0
-   **Containerization**: Docker & Docker Compose
-   **CI/CD**: GitHub Actions

---

## Manual Setup

If you prefer to run the components individually:

### Prerequisites
- Node.js (v22+)
- MySQL (v8.0+)

### 1. Database Setup
1. Create a database named `bank_saving_system`.
2. Run the migration script: `database/migrations/migrations.sql`.

### 2. Backend Setup
1. `cd backend`
2. `npm install`
3. Create a `.env` file based on `.env.example` and configure your database credentials.
4. `npm run dev`

### 3. Frontend Setup
1. `cd frontend`
2. `npm install`
3. `npm run dev`

---

## Testing

The backend includes a comprehensive integration test suite.

```bash
cd backend
# Ensure the server is running first
bash test-api.sh
```

The test suite covers:
- Customer CRUD & validation.
- Deposito Type management.
- Account opening.
- Deposit transactions.
- **Withdrawal logic** (Interest calculation based on months held).
- **Edge cases**: Zero balance prevention, `RESTRICT` deletion constraints.

---

## Project Structure

- `backend/`: Node.js Express API.
- `frontend/`: React Vite application.
- `database/`: SQL migrations and seed data.
- `docs/`: Technical documentation (ERD, API Spec, Diagrams).
- `.github/workflows/`: CI/CD pipeline configuration.

---

## License
Distributed under the MIT License. See `LICENSE` for more information.

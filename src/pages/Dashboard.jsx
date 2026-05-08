import { Link } from 'react-router-dom';

export default function Dashboard() {
  return (
    <div className="dashboard-page">
      <section className="dashboard-hero">
        <div>
          <p className="dashboard-kicker">Candidate Workspace</p>
          <h1>Welcome back to HireSphere</h1>
          <p>
            Practice mock interviews with verified industry interviewers and track your preparation journey in one place.
          </p>
        </div>
      </section>

      <section className="dashboard-stats">
        <article className="dashboard-stat-card">
          <span>Readiness</span>
          <strong>84%</strong>
          <p>Based on your recent mock interviews and submissions.</p>
        </article>
        <article className="dashboard-stat-card">
          <span>Upcoming</span>
          <strong>2</strong>
          <p>Interview sessions booked for this week.</p>
        </article>
        <article className="dashboard-stat-card">
          <span>Completed</span>
          <strong>9</strong>
          <p>Mock interviews completed in total.</p>
        </article>
      </section>

      <section className="dashboard-actions">
        <Link
          to="/book"
          className="dashboard-action-card"
        >
          <h2>Book an interview</h2>
          <p>Search interviewers and schedule a mock interview.</p>
        </Link>
        <Link
          to="/bookings"
          className="dashboard-action-card"
        >
          <h2>My bookings</h2>
          <p>View and manage your upcoming and past bookings.</p>
        </Link>
        <Link
          to="/submissions"
          className="dashboard-action-card"
        >
          <h2>Submissions</h2>
          <p>Upload coding challenge solutions or GitHub links.</p>
        </Link>
        <Link
          to="/interviews"
          className="dashboard-action-card"
        >
          <h2>Interview history</h2>
          <p>View past interviews and evaluation reports.</p>
        </Link>
      </section>
    </div>
  );
}

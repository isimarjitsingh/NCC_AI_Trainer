import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Activity,
  ClipboardList,
  Info,
  Shield,
  Users,
  MapPin,
  Calendar,
  Trophy,
} from "lucide-react";

export default function About() {
  const navigate = useNavigate();

  return (
    <div className="about-page">
      <header className="about-header">
        <div className="about-header-content">
          <button
            className="about-back-btn"
            onClick={() => navigate("/")}
            aria-label="Back to Dashboard"
          >
            <ArrowLeft size={20} />
            <span>Back to Dashboard</span>
          </button>
          <div className="about-brand">
            <span className="about-brand-ncc">NCC</span>
            <span className="about-brand-drill">DRILL ANALYZER</span>
          </div>
        </div>
      </header>

      <main className="about-main">
        <section className="about-hero">
          <div className="about-hero-content">
            <div className="about-hero-badge">
              <Info size={24} />
              <span>About NCC Innovation Camp</span>
            </div>
            <h1 className="about-hero-title">
              NCC Innovation, Incubation &amp; Cultural Camp
            </h1>
            <p className="about-hero-subtitle">
              Idea &amp; Innovation Competition — National Level
            </p>
            <div className="about-hero-divider" />
          </div>
        </section>

        <section className="about-section">
          <div className="about-container">
            <div className="about-grid">
              <div className="about-card">
                <div className="about-card-icon">
                  <MapPin size={28} />
                </div>
                <h3>Camp Overview</h3>
                <p className="about-card-label">Event</p>
                <p className="about-card-value">
                  NCC Innovation, Incubation and Cultural Camp (Idea &amp;
                  Innovation Competition)
                </p>
                <p className="about-card-label">Host &amp; Location</p>
                <p className="about-card-value">
                  Vijayawada, Andhra Pradesh
                </p>
                <p className="about-card-label small">
                  Organized under the aegis of DG NCC by the AP&amp;
                  T Directorate
                </p>
                <p className="about-card-label">Timeline</p>
                <p className="about-card-value">
                  October 2026 (following your Directorate-level selection
                  round)
                </p>
              </div>

              <div className="about-card">
                <div className="about-card-icon" style={{ color: "#004D40" }}>
                  <Users size={28} />
                </div>
                <h3>Competition Scale</h3>
                <div className="about-stats">
                  <div className="about-stat">
                    <span className="about-stat-number">19</span>
                    <span className="about-stat-label">Directorates</span>
                  </div>
                  <div className="about-stat">
                    <span className="about-stat-number">5</span>
                    <span className="about-stat-label">Teams per Directorate</span>
                  </div>
                  <div className="about-stat">
                    <span className="about-stat-number">95</span>
                    <span className="about-stat-label">Total Competing Teams</span>
                  </div>
                  <div className="about-stat">
                    <span className="about-stat-number">Top 10</span>
                    <span className="about-stat-label">Your National Rank</span>
                  </div>
                </div>
                <div className="about-result-badge">
                  <Trophy size={20} />
                  <span>
                    Top ~10.5% Nationwide — Finishing in the Top 10 out of 95
                    competing teams
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="about-section about-section-alt">
          <div className="about-container">
            <div className="about-card about-card-full">
              <div className="about-card-header">
                <div className="about-card-icon" style={{ color: "#1565C0" }}>
                  <Shield size={28} />
                </div>
                <h3>Your Entry &amp; Role</h3>
              </div>
              <div className="about-details">
                <div className="about-detail">
                  <span className="about-detail-key">Rank</span>
                  <span className="about-detail-value">Under Officer (UO)</span>
                </div>
                <div className="about-detail">
                  <span className="about-detail-key">Directorate</span>
                  <span className="about-detail-value">
                    Punjab, Haryana, Himachal Pradesh &amp; Chandigarh
                  </span>
                </div>
                <div className="about-detail">
                  <span className="about-detail-key">Institution</span>
                  <span className="about-detail-value">CT University</span>
                </div>
                <div className="about-detail">
                  <span className="about-detail-key">Project</span>
                  <span className="about-detail-value">
                    NCC Drill Analyzer — an AI-powered computer vision posture
                    and drill evaluation system built using MediaPipe Pose,
                    OpenCV, Flask, React, and Amazon Polly for real-time
                    voice-guided feedback.
                  </span>
                </div>
                <div className="about-detail">
                  <span className="about-detail-key">Key Evaluations</span>
                  <span className="about-detail-value">
                    Demonstrated live webcam and video-upload diagnostics for
                    core cadet movements (salutes, high leg marching, attention,
                    and turns).
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="about-section">
          <div className="about-container">
            <div className="about-card about-card-full">
              <div className="about-card-header">
                <div className="about-card-icon" style={{ color: "#004D40" }}>
                  <ClipboardList size={28} />
                </div>
                <h3>Camp Focus &amp; Format</h3>
              </div>
              <div className="about-focus-grid">
                <div className="about-focus-item">
                  <Activity size={20} />
                  <div>
                    <h4>Objective</h4>
                    <p>
                      Aligned with the Viksit Bharat @ 2047 vision to foster
                      defence tech, practical problem-solving, and startup /
                      innovation awareness among cadets.
                    </p>
                  </div>
                </div>
                <div className="about-focus-item">
                  <Trophy size={20} />
                  <div>
                    <h4>Evaluation Rounds</h4>
                    <p>
                      Concept note submissions, prototype demonstrations, visual
                      presentations, and live pitching to a judging panel
                      evaluating societal/defence utility, technical execution,
                      and scalability.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <footer className="about-footer">
          <div className="about-container">
            <div className="about-footer-content">
              <span>NCC DRILL ANALYZER</span>
              <span>·</span>
              <span>NCC INNOVATION CAMP</span>
            </div>
            <div className="about-footer-tags">
              <span>UNITY</span>
              <span>·</span>
              <span>DISCIPLINE</span>
              <span>·</span>
              <span>SERVICE</span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
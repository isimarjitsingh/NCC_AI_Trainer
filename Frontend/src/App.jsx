import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  AudioLines,
  BadgeCheck,
  Check,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Crosshair,
  FileVideo,
  LayoutDashboard,
  LoaderCircle,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Square,
  UploadCloud,
  Video,
} from "lucide-react";

const DRILLS = [
  {
    value: "high_leg_march",
    label: "High Leg March",
    detail: "Attention & marching",
    icon: "01",
  },
  {
    value: "salute",
    label: "NCC Salute",
    detail: "Posture & hand position",
    icon: "02",
  },
  {
    value: "turn_right",
    label: "Right Turn",
    detail: "Dahine Mur",
    icon: "03",
  },
  { value: "turn_left", label: "Left Turn", detail: "Baen Mur", icon: "04" },
];

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

function App() {
  const [file, setFile] = useState(null);
  const [selectedDrills, setSelectedDrills] = useState([]);
  const [mode, setMode] = useState("upload");
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [imageSource, setImageSource] = useState(null);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [inputError, setInputError] = useState("");
  const [dragging, setDragging] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const fileInputRef = useRef(null);
  const resultsRef = useRef(null);
  const cameraRequestRef = useRef(0);

  useEffect(() => {
    if (cameraReady && videoRef.current)
      videoRef.current.srcObject = streamRef.current;
  }, [cameraReady]);

  useEffect(
    () => () => {
      cameraRequestRef.current += 1;
      if (recorderRef.current?.state === "recording") {
        recorderRef.current.onstop = null;
        recorderRef.current.stop();
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  const stopCamera = () => {
    cameraRequestRef.current += 1;
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.onstop = null;
      recorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraReady(false);
    setRecording(false);
  };

  const startCamera = async () => {
    const request = ++cameraRequestRef.current;
    setMode("live");
    setCameraError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      if (request !== cameraRequestRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      setCameraReady(true);
    } catch {
      if (request === cameraRequestRef.current) {
        setCameraError(
          "Could not access your camera. Check your browser permissions and try again.",
        );
      }
    }
  };

  const selectFile = (selectedFile) => {
    if (!selectedFile) return;
    if (
      !/\.(mp4|webm)$/i.test(selectedFile.name) &&
      !["video/mp4", "video/webm"].includes(selectedFile.type)
    ) {
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setInputError("Please choose an MP4 or WebM video.");
      return;
    }
    setFile(selectedFile);
    setInputError("");
  };

  const analyze = async (videoFile) => {
    if (!videoFile || selectedDrills.length === 0) return;
    setLoading(true);
    setVoiceError("");
    setFeedback("");
    setImageSource(null);
    const formData = new FormData();
    formData.append("video", videoFile);
    formData.append("drill_types", JSON.stringify(selectedDrills));
    try {
      const response = await fetch(`${API_URL}/upload_and_analyze`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok || !data.success)
        throw new Error(data.error || "Unable to analyze this video.");
      setFeedback(data.feedback);
      setImageSource(data.annotated_image_b64 || null);
    } catch (error) {
      setFeedback(
        `Analysis failed: ${error.message}. Please check that the analysis service is running and try again.`,
      );
    } finally {
      setLoading(false);
      setTimeout(
        () =>
          resultsRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          }),
        100,
      );
    }
  };

  const startRecording = () => {
    if (!streamRef.current || !selectedDrills.length) return;
    try {
      const recorder = new MediaRecorder(streamRef.current);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const video = new File(chunksRef.current, "live-drill.webm", {
          type: recorder.mimeType || "video/webm",
        });
        stopCamera();
        setMode("upload");
        analyze(video);
      };
      recorder.start();
      setRecording(true);
    } catch {
      setCameraError("Recording is not supported by this browser or camera.");
    }
  };

  const playVoiceReport = async () => {
    if (voiceLoading) return;
    setVoiceLoading(true);
    setVoiceError("");
    let url;
    try {
      const response = await fetch(`${API_URL}/generate_polly_voice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report_text: feedback.replace(/[^a-zA-Z0-9.,;!?()\s]/g, ""),
        }),
      });
      if (!response.ok) throw new Error("Voice report is unavailable.");
      url = URL.createObjectURL(await response.blob());
      const audio = new Audio(url);
      const cleanup = () => {
        URL.revokeObjectURL(url);
        setVoiceLoading(false);
      };
      audio.onended = cleanup;
      audio.onerror = cleanup;
      await audio.play();
    } catch {
      if (url) URL.revokeObjectURL(url);
      setVoiceLoading(false);
      setVoiceError("Could not play the voice report. Please try again.");
    }
  };

  const toggleDrill = (value) => {
    setSelectedDrills((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#top" aria-label="NCC Drill AI home">
          <span className="brand-mark">
            <img src="/ncc_logo.png" alt="" />
          </span>
          <span>
            <strong>
              NCC <span>DRILL AI</span>
            </strong>
            <small>THE CADET'S COMPANION</small>
          </span>
        </a>
        <div className="sidebar-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          <a className="active" href="#top">
            <LayoutDashboard size={18} /> Dashboard{" "}
            <ChevronRight className="nav-arrow" size={16} />
          </a>
          <a href="#analyzer">
            <ScanLine size={18} /> Drill Analyzer
          </a>
          <a href="#results">
            <ClipboardList size={18} /> Analysis Report
          </a>
          <a href="#guide">
            <CircleHelp size={18} /> How it works
          </a>
        </nav>
        <div className="sidebar-bottom">
          <div className="side-motto">
            <span className="motto-icon">
              <ShieldCheck size={19} />
            </span>
            <div>
              <strong>Unity & Discipline</strong>
              <small>In every step forward.</small>
            </div>
          </div>
          <div className="side-footer">
            BUILT FOR CADETS <span>✦</span> BUILT FOR GROWTH
          </div>
        </div>
      </aside>

      <div className="main-wrap" id="top">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>Dashboard</strong>
          </div>
          <div className="topbar-right">
            <span className="topbar-motto">
              UNITY <i>•</i> DISCIPLINE <i>•</i> EXCELLENCE
            </span>
            <span className="cadet-avatar">NC</span>
            <span className="cadet-label">
              <strong>Cadet Portal</strong>
              <small>Ready to train</small>
            </span>
          </div>
        </header>

        <main className="page-content">
          <div className="welcome-row">
            <div>
              <div className="eyebrow">
                <span></span> YOUR TRAINING SPACE
              </div>
              <h1>
                Every step counts, Cadet<span className="heading-dot">.</span>
              </h1>
              <p>Train with purpose. Improve with every drill.</p>
            </div>
            <div className="welcome-badge">
              <Sparkles size={15} /> YOUR AI TRAINING PARTNER
            </div>
          </div>

          <section className="hero" aria-label="Drill training introduction">
            <div className="hero-image"></div>
            <div className="hero-shade"></div>
            <div className="hero-content">
              <div className="hero-tag">
                <span></span> THE PATH TO PRECISION
              </div>
              <h2>
                Discipline in motion.
                <br />
                <em>Excellence in every drill.</em>
              </h2>
              <p>
                Take your training further with AI-powered insights made for NCC
                cadets.
              </p>
              <a href="#analyzer" className="hero-button">
                Start your analysis <ArrowRight size={16} />
              </a>
            </div>
            <div className="hero-side-note">
              <span>01 / TRAIN WITH PURPOSE</span>
              <div></div>
              <strong>
                BETTER
                <br />
                EVERY DAY.
              </strong>
            </div>
            <div className="hero-index">
              <span>01</span>
              <span></span> THE DRILL ANALYZER
            </div>
          </section>

          <div className="section-heading" id="analyzer">
            <div>
              <div className="eyebrow">
                <span></span> LET'S GET STARTED
              </div>
              <h2>Analyze your drill</h2>
              <p>A little practice goes a long way. Let's make yours count.</p>
            </div>
            <div className="section-note">
              <Crosshair size={16} /> YOUR TRAINING, YOUR PROGRESS
            </div>
          </div>

          <div className="workspace-grid">
            <section className="panel upload-panel">
              <div className="panel-heading">
                <div className="step-number">01</div>
                <div>
                  <h3>Add your video</h3>
                  <p>Choose how you'd like to capture your drill.</p>
                </div>
                <Video className="panel-heading-icon" size={20} />
              </div>
              <div className="mode-tabs" role="group" aria-label="Video source">
                <button
                  type="button"
                  className={mode === "upload" ? "selected" : ""}
                  onClick={() => {
                    stopCamera();
                    setMode("upload");
                    setCameraError("");
                  }}
                  disabled={loading}
                >
                  <UploadCloud size={16} /> Upload video
                </button>
                <button
                  type="button"
                  className={mode === "live" ? "selected" : ""}
                  onClick={() => {
                    if (mode !== "live") startCamera();
                  }}
                  disabled={loading}
                >
                  <Video size={16} /> Live recording
                </button>
              </div>
              {mode === "upload" ? (
                <>
                  <div
                    className={`dropzone ${dragging ? "dragging" : ""}`}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(event) => {
                      event.preventDefault();
                      setDragging(false);
                      selectFile(event.dataTransfer.files[0]);
                    }}
                  >
                    <input
                      ref={fileInputRef}
                      id="video-upload"
                      type="file"
                      accept="video/mp4,video/webm,.mp4,.webm"
                      onChange={(event) => selectFile(event.target.files[0])}
                      disabled={loading}
                    />
                    <div className="upload-icon">
                      <UploadCloud size={24} strokeWidth={1.6} />
                    </div>
                    <strong>{file ? file.name : "Drop your video here"}</strong>
                    <p>
                      {file
                        ? "Your video is ready for analysis."
                        : "or browse files from your device"}
                    </p>
                    <button
                      type="button"
                      className="browse-button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={loading}
                    >
                      {file ? "Change video" : "Browse files"}{" "}
                      <ArrowRight size={14} />
                    </button>
                    <small>SUPPORTED FORMATS: MP4, WEBM</small>
                  </div>
                  <div className="upload-tip">
                    <span>
                      <Sparkles size={15} />
                    </span>
                    <p>
                      <strong>For best results</strong> Make sure your full body
                      is visible and the area is well-lit.
                    </p>
                  </div>
                </>
              ) : (
                <div className="live-area">
                  <div className="camera-view">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      aria-label="Live camera preview"
                    />
                    {!cameraReady && (
                      <div className="camera-placeholder">
                        {cameraError
                          ? "Camera unavailable"
                          : "Connecting to camera..."}
                      </div>
                    )}
                    {recording && (
                      <span className="recording-indicator">
                        <span></span> RECORDING
                      </span>
                    )}
                  </div>
                  {cameraError ? (
                    <div className="camera-message" role="alert">
                      {cameraError}{" "}
                      <button
                        type="button"
                        onClick={() => {
                          stopCamera();
                          startCamera();
                        }}
                      >
                        Try again
                      </button>
                    </div>
                  ) : (
                    <p className="camera-hint">
                      {recording
                        ? "Perform your drill, then stop to analyze."
                        : "Position yourself so your full body is visible."}
                    </p>
                  )}
                  <button
                    type="button"
                    className="record-button"
                    disabled={
                      !cameraReady ||
                      loading ||
                      (!recording && !selectedDrills.length)
                    }
                    onClick={() =>
                      recording ? recorderRef.current?.stop() : startRecording()
                    }
                  >
                    {recording ? (
                      <>
                        <Square size={15} fill="currentColor" /> Stop & analyze
                      </>
                    ) : (
                      <>
                        <span className="record-dot"></span> Start recording
                      </>
                    )}
                  </button>
                </div>
              )}
              {inputError && (
                <p className="input-error" role="alert">
                  {inputError}
                </p>
              )}
            </section>

            <section className="panel drills-panel">
              <div className="panel-heading">
                <div className="step-number">02</div>
                <div>
                  <h3>Choose your drills</h3>
                  <p>Select one or more commands to analyze.</p>
                </div>
                <Crosshair className="panel-heading-icon" size={20} />
              </div>
              <div className="drill-list">
                {DRILLS.map((drill) => (
                  <label
                    key={drill.value}
                    className={`drill-option ${selectedDrills.includes(drill.value) ? "checked" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedDrills.includes(drill.value)}
                      onChange={() => toggleDrill(drill.value)}
                      disabled={loading || recording}
                    />
                    <span className="drill-icon">{drill.icon}</span>
                    <span className="drill-copy">
                      <strong>{drill.label}</strong>
                      <small>{drill.detail}</small>
                    </span>
                    <span className="custom-check">
                      <Check size={13} strokeWidth={3} />
                    </span>
                  </label>
                ))}
              </div>
              <div className="selection-count">
                <span>
                  <span className="count-dot"></span> {selectedDrills.length}{" "}
                  {selectedDrills.length === 1 ? "DRILL" : "DRILLS"} SELECTED
                </span>
                <span>MULTIPLE SELECTION ALLOWED</span>
              </div>
              {mode === "upload" ? (
                <button
                  type="button"
                  className="analyze-button"
                  onClick={() => analyze(file)}
                  disabled={loading || !file || !selectedDrills.length}
                >
                  {loading ? (
                    <>
                      <LoaderCircle className="spin" size={17} /> Analyzing your
                      drill...
                    </>
                  ) : (
                    <>
                      Analyze my drill <ArrowRight size={17} />
                    </>
                  )}
                </button>
              ) : (
                <div className="live-selection-note">
                  <BadgeCheck size={17} />{" "}
                  {selectedDrills.length
                    ? "Your selected drills are ready to record."
                    : "Select a drill to start recording."}
                </div>
              )}
            </section>
          </div>

          <section className="results-section" id="results" ref={resultsRef}>
            <div className="results-title">
              <div>
                <div className="eyebrow">
                  <span></span> YOUR FEEDBACK
                </div>
                <h2>Analysis report</h2>
                <p>See where you're doing well and where to improve.</p>
              </div>
              {feedback.startsWith("JAI HIND") && (
                <button
                  className="voice-button"
                  type="button"
                  onClick={playVoiceReport}
                  disabled={voiceLoading}
                >
                  <AudioLines size={16} />{" "}
                  {voiceLoading ? "Playing report..." : "Listen to report"}
                </button>
              )}
            </div>
            {voiceError && (
              <p className="input-error" role="alert">
                {voiceError}
              </p>
            )}
            {feedback ? (
              <div className="report-content">
                {imageSource && (
                  <img src={imageSource} alt="Annotated drill analysis" />
                )}
                <pre>{feedback}</pre>
              </div>
            ) : (
              <div className="empty-results">
                <div className="empty-icon">
                  <ClipboardList size={22} />
                </div>
                <div>
                  <strong>Your insights will appear here</strong>
                  <p>
                    Upload a video or record a drill to receive your
                    personalized feedback.
                  </p>
                </div>
                <ArrowDown size={18} />
              </div>
            )}
          </section>

          <section className="guide-section" id="guide">
            <div className="guide-heading">
              <div>
                <div className="eyebrow">
                  <span></span> SIMPLE BY DESIGN
                </div>
                <h2>Ready, set, improve.</h2>
                <p>Three steps towards a sharper drill.</p>
              </div>
              <span>
                YOUR TRAINING JOURNEY <ArrowRight size={15} />
              </span>
            </div>
            <div className="guide-grid">
              <div>
                <span className="guide-icon">
                  <FileVideo size={20} />
                </span>
                <small>STEP 01</small>
                <h3>Capture your drill</h3>
                <p>Upload a video or record yourself in action.</p>
              </div>
              <div>
                <span className="guide-icon">
                  <Crosshair size={20} />
                </span>
                <small>STEP 02</small>
                <h3>Select your commands</h3>
                <p>Choose the drills you want to focus on.</p>
              </div>
              <div>
                <span className="guide-icon">
                  <Sparkles size={20} />
                </span>
                <small>STEP 03</small>
                <h3>Learn & improve</h3>
                <p>Review your feedback and keep getting better.</p>
              </div>
            </div>
          </section>
          <footer className="footer">
            <span>
              © NCC DRILL AI <i>•</i> MADE FOR THE CADETS OF TOMORROW
            </span>
            <span>
              UNITY & DISCIPLINE{" "}
              <span className="footer-tricolor">
                <b></b>
                <b></b>
                <b></b>
              </span>
            </span>
          </footer>
        </main>
      </div>
      {loading && (
        <div className="loading-overlay" role="status">
          <div className="loading-card">
            <LoaderCircle className="spin" size={29} />
            <h3>Analyzing your drill</h3>
            <p>We're reviewing your performance. This may take a moment.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

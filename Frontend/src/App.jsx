import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AudioLines,
  Bell,
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Grid2X2,
  Info,
  LayoutDashboard,
  LoaderCircle,
  Mic2,
  MoreHorizontal,
  Search,
  Settings2,
  Shield,
  Square,
  Video,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

const DRILLS = [
  { value: "salute", label: "Salute", short: "SAL" },
  { value: "high_leg_march", label: "High Leg Marching", short: "MAR" },
  { value: "turn_right", label: "Right Turn", short: "RT" },
  { value: "turn_left", label: "Left Turn", short: "LT" },
];

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

function App() {
  const [file, setFile] = useState(null);
  const [selectedDrills, setSelectedDrills] = useState([]);
  const [mode, setMode] = useState("live");
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [imageSource, setImageSource] = useState(null);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [inputError, setInputError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [audioPrompts, setAudioPrompts] = useState(true);
  const [performanceHistory, setPerformanceHistory] = useState([]);
  const [filePreviewUrl, setFilePreviewUrl] = useState("");
  const [dragging, setDragging] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const fileInputRef = useRef(null);
  const cameraRequestRef = useRef(0);

  const visibleDrills = useMemo(
    () =>
      DRILLS.filter((drill) =>
        drill.label.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [searchQuery],
  );

  useEffect(() => {
    if (cameraReady && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraReady]);

  useEffect(() => {
    if (!file) {
      setFilePreviewUrl("");
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setFilePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

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
          "Camera access is unavailable. Check your browser permissions and try again.",
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
      setInputError("Choose an MP4 or WebM video to continue.");
      return;
    }
    setFile(selectedFile);
    setInputError("");
    setFeedback("");
    setImageSource(null);
  };

  const playVoiceReport = async (reportText = feedback) => {
    if (!audioPrompts || voiceLoading || !reportText) return;
    setVoiceLoading(true);
    setVoiceError("");
    let audioUrl;
    try {
      const response = await fetch(`${API_URL}/generate_polly_voice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report_text: reportText.replace(/[^a-zA-Z0-9.,;!?()\s]/g, ""),
        }),
      });
      if (!response.ok) throw new Error("Voice report is unavailable.");
      audioUrl = URL.createObjectURL(await response.blob());
      const audio = new Audio(audioUrl);
      const cleanup = () => {
        URL.revokeObjectURL(audioUrl);
        setVoiceLoading(false);
      };
      audio.onended = cleanup;
      audio.onerror = cleanup;
      await audio.play();
    } catch {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setVoiceLoading(false);
      setVoiceError("Voice feedback could not be played. Please try again.");
    }
  };

  const analyze = async (videoFile) => {
    if (!videoFile || selectedDrills.length === 0) return;
    setLoading(true);
    setVoiceError("");
    setInputError("");
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
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Unable to analyze this video.");
      }
      setFeedback(data.feedback);
      setImageSource(data.annotated_image_b64 || null);

      // Save to performance history
      setPerformanceHistory((prev) => [
        {
          id: Date.now(),
          date: new Date().toLocaleDateString(),
          drill: selectedDrills.join(", "),
          mode,
          feedback: data.feedback,
          image: data.annotated_image_b64 || null,
        },
        ...prev,
      ].slice(0, 10));
    } catch (error) {
      setFeedback(
        `Analysis failed: ${error.message}. Check that the analysis service is running, then try again.`,
      );
    } finally {
      setLoading(false);
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
        analyze(video);
      };
      recorder.start();
      setRecording(true);
    } catch {
      setCameraError("Recording is not supported by this browser or camera.");
    }
  };

  const toggleDrill = (value) => {
    setSelectedDrills((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  };

  const switchMode = (nextMode) => {
    if (nextMode === mode) return;
    stopCamera();
    setMode(nextMode);
    setCameraError("");
  };

  return (
    <div className="ops-dashboard" id="dashboard">
      <aside className="ops-sidebar">
        <a
          href="#dashboard"
          className="ops-brand"
          aria-label="NCC Drill Analyzer home"
        >
          <span className="ops-brand-mark">
            <img src="/ncc_logo.png" alt="" />
          </span>
          <span className="ops-brand-name">
            NCC DRILL
            <br />
            ANALYZER
          </span>
        </a>

        <nav className="ops-nav" aria-label="Workspace navigation">
          <a className="ops-nav-link active" href="#dashboard">
            <Grid2X2 size={16} /> Dashboard
          </a>
          <div className="ops-nav-group" id="drill-selection">
            <a className="ops-nav-link" href="#drill-list">
              <Activity size={16} /> Select Drill{" "}
              <ChevronDown className="ops-nav-chevron" size={14} />
            </a>
            <div className="ops-drill-nav" id="drill-list">
              {visibleDrills.length ? (
                visibleDrills.map((drill) => (
                  <label className="ops-drill-link" key={drill.value}>
                    <input
                      type="checkbox"
                      checked={selectedDrills.includes(drill.value)}
                      onChange={() => toggleDrill(drill.value)}
                      disabled={loading || recording}
                    />
                    <span>{drill.label}</span>
                    {selectedDrills.includes(drill.value) && (
                      <Check size={13} />
                    )}
                  </label>
                ))
              ) : (
                <span className="ops-search-empty">No drills found</span>
              )}
            </div>
          </div>
          <a className="ops-nav-link" href="#live-analysis">
            <Camera size={16} /> Live Analysis
          </a>
          <a className="ops-nav-link" href="#performance-report">
            <ClipboardList size={16} /> Performance History
          </a>
          <button
            className="ops-nav-link ops-nav-button"
            type="button"
            onClick={() => setAudioPrompts((enabled) => !enabled)}
          >
            <Volume2 size={16} /> Audio Feedback Settings{" "}
            <span
              className={`ops-audio-status ${audioPrompts ? "enabled" : "disabled"}`}
            >
              {audioPrompts ? "ON" : "OFF"}
            </span>
          </button>
          <a className="ops-nav-link" href="#about">
            <Info size={16} /> About NCC Innovation
            <br /> Camp
          </a>
        </nav>

        <div className="ops-sidebar-bottom">
          <div className="ops-competition">
            <span className="ops-laurel">❧</span>
            <span>
              <strong>TOP 10</strong>
              <small>
                INTER-DIRECTORATE
                <br />
                COMPETITION
              </small>
              <b>2026</b>
            </span>
            <span className="ops-laurel right">❧</span>
          </div>
          <span className="ops-campus">UNITY · DISCIPLINE · SERVICE</span>
        </div>
      </aside>

      <div className="ops-main">
        <header className="ops-topbar">
          <a
            className="ops-app-switch"
            href="#dashboard"
            aria-label="Dashboard"
          >
            <Grid2X2 size={17} />
          </a>
          <label className="ops-search">
            <Search size={16} />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search drills"
              aria-label="Search drills"
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearchQuery("")}
              >
                <X size={14} />
              </button>
            )}
          </label>
          <div className="ops-topbar-spacer" />
          <span className="ops-command-chip">
            <span className="ops-status-dot" />{" "}
            {cameraReady ? "CAMERA CONNECTED" : "TRAINING WORKSPACE"}
          </span>
          <button
            className="ops-notification"
            type="button"
            aria-label="Notifications"
          >
            <Bell size={17} />
            <i />
          </button>
        </header>

        <main className="ops-content">
          <div className="ops-mobile-title">
            <div>
              <span>
                NCC <b>DRILL ANALYZER</b>
              </span>
              <h1>Live analysis</h1>
            </div>
            <Shield size={21} />
          </div>
          <section className="ops-mobile-drill-picker" aria-label="Select drills">
            <span>SELECT DRILLS</span>
            <div>
              {visibleDrills.map((drill) => (
                <button
                  key={drill.value}
                  type="button"
                  aria-pressed={selectedDrills.includes(drill.value)}
                  disabled={loading || recording}
                  onClick={() => toggleDrill(drill.value)}
                >
                  {selectedDrills.includes(drill.value) && <Check size={12} />}
                  {drill.label}
                </button>
              ))}
            </div>
          </section>
          <section className="ops-workspace-grid">
            <article className="ops-card ops-camera-card" id="live-analysis">
              <header className="ops-card-header">
                <div className="ops-card-heading">
                  <h2>
                    {mode === "live" ? "Live Analysis" : "Video Analysis"}
                  </h2>
                  <span className="ops-card-subtitle">
                    {mode === "live"
                      ? "Capture your drill in real time"
                      : "Upload a recording for review"}
                  </span>
                </div>
                <div className="ops-card-actions">
                  <div
                    className="ops-mode-switch"
                    role="group"
                    aria-label="Choose analysis source"
                  >
                    <button
                      className={mode === "live" ? "selected" : ""}
                      onClick={() => switchMode("live")}
                      type="button"
                    >
                      <Video size={14} /> Live
                    </button>
                    <button
                      className={mode === "upload" ? "selected" : ""}
                      onClick={() => switchMode("upload")}
                      type="button"
                    >
                      Upload
                    </button>
                  </div>
                  <button
                    className="ops-icon-button"
                    type="button"
                    aria-label="Analysis options"
                  >
                    <MoreHorizontal size={19} />
                  </button>
                </div>
              </header>

              <div
                className={`ops-video-stage ${cameraReady && mode === "live" ? "camera-on" : ""}`}
              >
                {mode === "live" ? (
                  <>
                    <video
                      ref={videoRef}
                      className="ops-video"
                      autoPlay
                      playsInline
                      muted
                      aria-label="Live camera preview"
                    />
                    {!cameraReady && (
                      <div className="ops-camera-placeholder">
                        <span className="ops-camera-icon">
                          <Camera size={28} />
                        </span>
                        <strong>
                          {cameraError
                            ? "Camera unavailable"
                            : "Your camera view will appear here"}
                        </strong>
                        <span>
                          {cameraError ||
                            "Allow camera access when you're ready to begin."}
                        </span>
                        {cameraError ? (
                          <button
                            className="ops-enable-camera"
                            type="button"
                            disabled={loading}
                            onClick={startCamera}
                          >
                            Try again <ChevronRight size={14} />
                          </button>
                        ) : (
                          <button
                            className="ops-enable-camera"
                            type="button"
                            disabled={loading}
                            onClick={startCamera}
                          >
                            Enable camera <ChevronRight size={14} />
                          </button>
                        )}
                      </div>
                    )}
                    {cameraReady && (
                      <div
                        className={`ops-live-badge ${recording ? "is-recording" : ""}`}
                      >
                        <span />
                        {recording ? "REC" : "LIVE"}
                      </div>
                    )}
                    <div className="ops-video-caption">
                      <span className="ops-caption-light" />
                      {recording
                        ? "RECORDING DRILL"
                        : cameraReady
                          ? "CAMERA PREVIEW"
                          : "LIVE ANALYSIS"}
                      <span className="ops-caption-message">
                        {recording
                          ? "Perform your selected drill"
                          : cameraReady
                            ? "Ready when you are"
                            : "Camera is off"}
                      </span>
                    </div>
                  </>
                ) : (
                  <div
                    className={`ops-upload-stage ${file ? "has-file" : ""} ${dragging ? "dragging" : ""}`}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={(event) => {
                      if (!event.currentTarget.contains(event.relatedTarget)) {
                        setDragging(false);
                      }
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      setDragging(false);
                      selectFile(event.dataTransfer.files[0]);
                    }}
                  >
                    {filePreviewUrl ? (
                      <video
                        className="ops-upload-preview"
                        src={filePreviewUrl}
                        controls
                        playsInline
                      />
                    ) : (
                      <div className="ops-upload-prompt">
                        <span className="ops-camera-icon">
                          <Video size={27} />
                        </span>
                        <strong>
                          {file ? file.name : "Choose a training video"}
                        </strong>
                        <span>
                          MP4 or WebM · Use a clear, full-body recording
                        </span>
                        <button
                          className="ops-enable-camera"
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={loading}
                        >
                          {file ? "Choose another video" : "Browse files"}{" "}
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/mp4,video/webm,.mp4,.webm"
                      onChange={(event) => selectFile(event.target.files[0])}
                      disabled={loading}
                    />
                  </div>
                )}
              </div>

              <div className="ops-camera-controls">
                {mode === "live" ? (
                  <>
                    <div className="ops-capture-info">
                      <span
                        className={`ops-capture-indicator ${cameraReady ? "online" : ""}`}
                      />
                      <div>
                        <strong>
                          {recording
                            ? "Recording in progress"
                            : cameraReady
                              ? "Camera ready"
                              : "Camera not connected"}
                        </strong>
                        <small>
                          {selectedDrills.length
                            ? `${selectedDrills.length} drill${selectedDrills.length === 1 ? "" : "s"} selected`
                            : "Select a drill from the sidebar"}
                        </small>
                      </div>
                    </div>
                    {!cameraReady ? (
                      <button
                        type="button"
                        className="ops-primary-button"
                        disabled={loading}
                        onClick={startCamera}
                      >
                        <Camera size={15} /> Start camera
                      </button>
                    ) : recording ? (
                      <button
                        type="button"
                        className="ops-primary-button stop"
                        onClick={() => recorderRef.current?.stop()}
                      >
                        <Square size={14} fill="currentColor" /> Stop & analyze
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="ops-primary-button"
                        disabled={!selectedDrills.length || loading}
                        onClick={startRecording}
                      >
                        <span className="ops-button-record-dot" /> Start
                        recording
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <div className="ops-capture-info">
                      <span
                        className={`ops-capture-indicator ${file ? "online" : ""}`}
                      />
                      <div>
                        <strong>
                          {file ? file.name : "No video selected"}
                        </strong>
                        <small>
                          {file
                            ? "Video ready for analysis"
                            : "Select a video file to continue"}
                        </small>
                      </div>
                    </div>
                    <div className="ops-upload-actions">
                      <button
                        type="button"
                        className="ops-secondary-button"
                        disabled={loading}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Browse files
                      </button>
                      <button
                        type="button"
                        className="ops-primary-button"
                        disabled={!file || !selectedDrills.length || loading}
                        onClick={() => analyze(file)}
                      >
                        {loading ? (
                          <LoaderCircle size={15} className="spin" />
                        ) : (
                          <Activity size={15} />
                        )}{" "}
                        Analyze video
                      </button>
                    </div>
                  </>
                )}
              </div>
              {inputError && (
                <p className="ops-inline-error" role="alert">
                  {inputError}
                </p>
              )}
              {loading && (
                <div className="ops-analysis-progress">
                  <LoaderCircle size={15} className="spin" /> Reviewing your
                  drill…
                </div>
              )}
            </article>

            <aside className="ops-right-column">
              <section
                className="ops-card ops-metrics-card"
                aria-label="Real-time session metrics"
              >
                <header className="ops-card-header">
                  <div className="ops-card-heading">
                    <h2>Real-time Metrics</h2>
                    <span className="ops-card-subtitle">Session status</span>
                  </div>
                  <Activity size={17} className="ops-muted-icon" />
                </header>
                <div className="ops-metric-grid">
                  <div className="ops-metric">
                    <div className={`ops-gauge ${cameraReady ? "active" : ""}`}>
                      <span>{cameraReady ? "ON" : "OFF"}</span>
                    </div>
                    <strong>Camera</strong>
                    <small>{cameraReady ? "Connected" : "Standby"}</small>
                  </div>
                  <div className="ops-metric">
                    <div
                      className={`ops-gauge ${selectedDrills.length ? "active" : ""}`}
                    >
                      <span>
                        {selectedDrills.length}
                        <i>/4</i>
                      </span>
                    </div>
                    <strong>Drills</strong>
                    <small>
                      {selectedDrills.length ? "Selected" : "Choose a drill"}
                    </small>
                  </div>
                  <div className="ops-metric">
                    <div
                      className={`ops-gauge ${recording ? "recording" : ""}`}
                    >
                      <span>{recording ? "REC" : "READY"}</span>
                    </div>
                    <strong>Session</strong>
                    <small>{recording ? "Recording" : "Awaiting start"}</small>
                  </div>
                </div>
                <div className="ops-metrics-foot">
                  <span className="ops-status-dot" /> Live session indicators
                </div>
              </section>

              <section className="ops-card ops-coach-card">
                <header className="ops-card-header">
                  <div className="ops-card-heading">
                    <h2>AI Voice Coach</h2>
                    <span className="ops-card-subtitle">Amazon Polly</span>
                  </div>
                  <AudioLines size={18} className="ops-muted-icon" />
                </header>
                <div className="ops-waveform" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
                <div className="ops-coach-quote">
                  {feedback
                    ? feedback.slice(0, 154) +
                      (feedback.length > 154 ? "…" : "")
                    : "Your spoken drill feedback will appear here after analysis."}
                </div>
                <button
                  type="button"
                  className="ops-coach-play"
                  onClick={() => playVoiceReport()}
                  disabled={
                    !feedback ||
                    !audioPrompts ||
                    voiceLoading ||
                    !feedback.startsWith("JAI HIND")
                  }
                >
                  {voiceLoading ? (
                    <LoaderCircle size={14} className="spin" />
                  ) : (
                    <Mic2 size={14} />
                  )}
                  {voiceLoading
                    ? "Preparing voice feedback"
                    : "Play voice feedback"}
                  <ChevronRight size={14} />
                </button>
                {voiceError && (
                  <p className="ops-inline-error" role="alert">
                    {voiceError}
                  </p>
                )}
                <div className="ops-audio-toggle-row">
                  <span>
                    {audioPrompts ? (
                      <Volume2 size={14} />
                    ) : (
                      <VolumeX size={14} />
                    )}{" "}
                    Audio prompts
                  </span>
                  <button
                    className={`ops-toggle ${audioPrompts ? "on" : ""}`}
                    role="switch"
                    aria-checked={audioPrompts}
                    aria-label="Toggle audio prompts"
                    onClick={() => setAudioPrompts((enabled) => !enabled)}
                    type="button"
                  >
                    <span />
                  </button>
                  <small>{audioPrompts ? "ON" : "OFF"}</small>
                </div>
              </section>

              <section className="ops-card ops-selected-card">
                <header className="ops-card-header">
                  <div className="ops-card-heading">
                    <h2>Selected Drills</h2>
                    <span className="ops-card-subtitle">
                      Included in this analysis
                    </span>
                  </div>
                  <Settings2 size={16} className="ops-muted-icon" />
                </header>
                {selectedDrills.length ? (
                  <div className="ops-selected-list">
                    {DRILLS.filter((drill) =>
                      selectedDrills.includes(drill.value),
                    ).map((drill) => (
                      <div key={drill.value}>
                        <span>{drill.short}</span>
                        {drill.label}
                        <Check size={13} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="ops-no-drills">
                    Choose a drill from the left navigation.
                  </p>
                )}
              </section>
            </aside>
          </section>

          <section
            className="ops-report-card"
            id="performance-report"
            aria-live="polite"
          >
            <header className="ops-card-header">
              <div className="ops-card-heading">
                <h2>Performance Report</h2>
                <span className="ops-card-subtitle">Your latest analysis</span>
              </div>
              <ClipboardList size={17} className="ops-muted-icon" />
            </header>
            {feedback ? (
              <div className="ops-report-content">
                {imageSource && (
                  <img src={imageSource} alt="Annotated drill analysis" />
                )}
                <pre>{feedback}</pre>
              </div>
            ) : (
              <div className="ops-empty-report">
                <ClipboardList size={16} />
                <span>Your analysis will appear here after a drill.</span>
              </div>
            )}
          </section>

          {/* --- PERFORMANCE HISTORY SECTION --- */}
          <section
            className="ops-report-card"
            id="performance-history"
            aria-label="Performance History"
          >
            <header className="ops-card-header">
              <div className="ops-card-heading">
                <h2>Performance History</h2>
                <span className="ops-card-subtitle">
                  Your past drill analyses
                </span>
              </div>
              <ClipboardList size={17} className="ops-muted-icon" />
            </header>
            {performanceHistory.length === 0 ? (
              <div className="ops-empty-report">
                <ClipboardList size={16} />
                <span>
                  No analysis history yet. Complete a drill analysis to see
                  records here.
                </span>
              </div>
            ) : (
              <div className="ops-history-list">
                {performanceHistory.map((record) => (
                  <div key={record.id} className="ops-history-item">
                    <div className="ops-history-header">
                      <span className="ops-history-date">{record.date}</span>
                      <span className="ops-history-mode">{record.mode}</span>
                    </div>
                    <div className="ops-history-drills">
                      {record.drill.split(",").map((d, i) => (
                        <span key={i} className="ops-history-drill">
                          {d.trim()}
                        </span>
                      ))}
                    </div>
                    <div className="ops-history-feedback">
                      <pre>{record.feedback}</pre>
                    </div>
                    {record.image && (
                      <img
                        src={record.image}
                        alt="Past analysis"
                        className="ops-history-image"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* --- ABOUT NCC CAMP SECTION --- */}
          <section className="ops-report-card" id="about" aria-label="About NCC Camp">
            <header className="ops-card-header">
              <div className="ops-card-heading">
                <h2>About NCC Innovation Camp</h2>
                <span className="ops-card-subtitle">
                  NCC Innovation, Incubation and Cultural Camp
                </span>
              </div>
              <Info size={17} className="ops-muted-icon" />
            </header>
            <div className="ops-about-content">
              <div className="ops-about-grid">
                <div className="ops-about-card">
                  <h3>Camp Overview</h3>
                  <p>
                    <strong>Event:</strong> NCC Innovation, Incubation and Cultural Camp (Idea &amp; Innovation Competition)
                  </p>
                  <p>
                    <strong>Host &amp; Location:</strong> Vijayawada, Andhra Pradesh (organized under the aegis of DG NCC by the AP&amp;T Directorate)
                  </p>
                  <p>
                    <strong>Timeline:</strong> October 2026 (following your Directorate-level selection round)
                  </p>
                </div>
                <div className="ops-about-card">
                  <h3>Competition Scale</h3>
                  <p>
                    <strong>Participating Directorates:</strong> 19
                  </p>
                  <p>
                    <strong>Teams per Directorate:</strong> 5
                  </p>
                  <p>
                    <strong>Total Competing Teams:</strong> 95 teams nationally
                  </p>
                  <p>
                    <strong>Your Result:</strong> Top 10 nationally (top ~10.5% nationwide)
                  </p>
                </div>
              </div>
              <div className="ops-about-card full-width">
                <h3>Your Entry &amp; Role</h3>
                <p>
                  <strong>Rank:</strong> Under Officer (UO)
                </p>
                <p>
                  <strong>Directorate:</strong> Punjab, Haryana, Himachal Pradesh &amp; Chandigarh Directorate
                </p>
                <p>
                  <strong>Institution:</strong> CT University
                </p>
                <p>
                  <strong>Project:</strong> NCC Drill Analyzer — an AI-powered computer vision posture and drill evaluation system built using MediaPipe Pose, OpenCV, Flask, React, and Amazon Polly for real-time voice-guided feedback.
                </p>
                <p>
                  <strong>Key Evaluations:</strong> Demonstrated live webcam and video-upload diagnostics for core cadet movements (salutes, high leg marching, attention, and turns).
                </p>
              </div>
              <div className="ops-about-card full-width">
                <h3>Camp Focus &amp; Format</h3>
                <p>
                  <strong>Objective:</strong> Aligned with the Viksit Bharat @ 2047 vision to foster defence tech, practical problem-solving, and startup/innovation awareness among cadets.
                </p>
                <p>
                  <strong>Evaluation Rounds:</strong> Concept note submissions, prototype demonstrations, visual presentations, and live pitching to a judging panel evaluating societal/defence utility, technical execution, and scalability.
                </p>
              </div>
            </div>
          </section>

          <footer className="ops-footer">
            <span>
              NCC DRILL ANALYZER <i>·</i> NCC INNOVATION CAMP
            </span>
            <span>UNITY · DISCIPLINE · SERVICE</span>
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

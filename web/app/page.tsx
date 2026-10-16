"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";

type Result = { score: number; inferenceMs: number; totalMs: number };
type Ready = {
  version: string;
  bytes: number;
  cached: boolean;
  downloadMs: number;
  initMs: number;
};
const safety =
  "This project is an educational image-classification demonstration. Its predictions must never be used to determine whether wild mushrooms are safe to eat.";
function Arrow() {
  return <span aria-hidden="true">↗</span>;
}
function Mushroom() {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="M4 18C4 3 28 3 28 18H4Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M13 18 11 28h10l-2-10M9 13h.01M17 9h.01M23 14h.01"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
export default function Home() {
  const [status, setStatus] = useState("Waiting to load");
  const [ready, setReady] = useState<Ready | null>(null);
  const [progress, setProgress] = useState(0);
  const [modelError, setModelError] = useState("");
  const [error, setError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [dark, setDark] = useState(false);
  const worker = useRef<Worker | null>(null);
  const request = useRef(0);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const input = useRef<HTMLInputElement>(null);
  function stopTimer() {
    if (timeout.current) clearTimeout(timeout.current);
  }
  function startWorker() {
    stopTimer();
    worker.current?.terminate();
    setReady(null);
    setModelError("");
    setProgress(0);
    setStatus("Downloading model");
    if (!window.Worker || !window.WebAssembly || !window.createImageBitmap) {
      setModelError(
        "This browser does not support local inference. Please use a recent Chrome, Edge, Firefox or Safari.",
      );
      return;
    }
    const instance = new Worker("/inference-worker.js");
    worker.current = instance;
    timeout.current = setTimeout(() => {
      instance.terminate();
      setModelError(
        "Model loading timed out. Check your connection and retry.",
      );
    }, 180000);
    instance.onerror = () => {
      stopTimer();
      setBusy(false);
      setModelError(
        "The inference worker could not start. Please retry or use a recent browser.",
      );
    };
    instance.onmessage = ({ data }) => {
      if (data.type === "progress") {
        setProgress(data.progress);
      }
      if (data.type === "initializing") setStatus("Preparing local inference");
      if (data.type === "ready") {
        stopTimer();
        setReady(data);
        setStatus("Ready · runs on your device");
      }
      if (data.type === "result" && data.id === request.current) {
        stopTimer();
        setResult(data);
        setBusy(false);
      }
      if (data.type === "error") {
        if (data.phase === "init") {
          stopTimer();
          setModelError(data.message);
        } else if (data.id === request.current) {
          stopTimer();
          setError(data.message);
          setBusy(false);
        }
      }
    };
    instance.postMessage({ type: "init" });
  }
  useEffect(() => {
    const timer = setTimeout(startWorker, 600);
    return () => {
      clearTimeout(timer);
      stopTimer();
      worker.current?.terminate();
    };
    // Start once after the initial render; no model work blocks the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);
  function selectFile(candidate?: File) {
    if (!candidate) return;
    setError("");
    setResult(null);
    if (!["image/jpeg", "image/png", "image/webp"].includes(candidate.type)) {
      setError("Choose a JPEG, PNG or WebP image.");
      return;
    }
    if (candidate.size > 16 * 1024 * 1024) {
      setError("Choose an image smaller than 16 MB.");
      return;
    }
    if (candidate.size === 0) {
      setError("This file is empty. Choose another image.");
      return;
    }
    setFile(candidate);
    setPreview(URL.createObjectURL(candidate));
  }
  function clear() {
    request.current++;
    setFile(null);
    setPreview("");
    setResult(null);
    setError("");
    if (input.current) input.current.value = "";
  }
  async function classify() {
    if (!ready || !file || busy) return;
    setBusy(true);
    setError("");
    setResult(null);
    request.current++;
    timeout.current = setTimeout(() => {
      worker.current?.terminate();
      setBusy(false);
      setReady(null);
      setModelError(
        "Prediction timed out on this device. Reload the model and try a smaller image.",
      );
    }, 120000);
    try {
      if (window.OffscreenCanvas) {
        worker.current?.postMessage({
          type: "predict",
          file,
          id: request.current,
        });
      } else {
        const start = performance.now();
        const bitmap = await createImageBitmap(file, {
          imageOrientation: "none",
          premultiplyAlpha: "none",
          colorSpaceConversion: "none",
        });
        if (bitmap.width * bitmap.height > 24000000) {
          bitmap.close();
          throw new Error(
            "Image exceeds 24 megapixels. Please use a smaller image.",
          );
        }
        const canvas = document.createElement("canvas");
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) {
          bitmap.close();
          throw new Error("Image decoding is unavailable in this browser.");
        }
        context.drawImage(bitmap, 0, 0);
        bitmap.close();
        const pixels = context.getImageData(
          0,
          0,
          canvas.width,
          canvas.height,
        ).data;
        worker.current?.postMessage(
          {
            type: "predict",
            id: request.current,
            pixels,
            width: canvas.width,
            height: canvas.height,
            decodeMs: performance.now() - start,
          },
          [pixels.buffer],
        );
      }
    } catch (error) {
      stopTimer();
      setBusy(false);
      setError(
        error instanceof Error ? error.message : "Unable to decode this image.",
      );
    }
  }
  return (
    <div className={dark ? "site dark" : "site"}>
      <a className="skip" href="#classifier">
        Skip to classifier
      </a>
      <header className="nav wrap">
        <a className="brand" href="#">
          <Mushroom />
          <span>
            mushroom<span className="brand-light">atlas</span>
            <sup>AI</sup>
          </span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#classifier">Classifier</a>
          <a href="#model">The model</a>
          <a href="#about">About</a>
        </nav>
        <div className="nav-end">
          <button
            className="theme"
            aria-label={dark ? "Use light theme" : "Use dark theme"}
            onClick={() => setDark(!dark)}
          >
            {dark ? "☀" : "◐"}
          </button>
          <a
            className="source-link"
            href="https://github.com/buanupgit/mushroom_classifier"
            target="_blank"
            rel="noreferrer"
          >
            View source <Arrow />
          </a>
        </div>
      </header>
      <main>
        <section className="hero wrap" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="dot" /> A FIELD STUDY IN MACHINE LEARNING
            </p>
            <h1 id="hero-title">
              Deep learning.
              <br />
              <em>Closer to nature.</em>
            </h1>
            <p className="hero-subtitle">
              Mushroom Classification with Deep Learning
            </p>
            <p className="lede">
              Explore image classification powered by an EfficientNetB0
              transfer-learning model. A little curiosity, a photograph, and AI
              that runs right in your browser.
            </p>
            <div className="hero-actions">
              <a className="button primary" href="#classifier">
                Try the classifier <span aria-hidden="true">↓</span>
              </a>
              <a className="text-link" href="#model">
                Explore the model <Arrow />
              </a>
            </div>
            <div className="tech-tags">
              <span>EfficientNetB0</span>
              <span>ONNX Runtime</span>
              <span>Browser inference</span>
            </div>
          </div>
          <div className="hero-art">
            <div className="art-top">
              <span>THE FOREST, THROUGH A DIFFERENT LENS</span>
              <span>FIG. 01</span>
            </div>
            <Image
              src="/forest-study.svg"
              alt="Botanical illustration of woodland mushrooms, with fine scientific guide lines"
              width={800}
              height={800}
              priority
            />
            <div className="art-bottom">
              <span>
                Patterns in nature.
                <br />
                <strong>Learned by a neural network.</strong>
              </span>
              <span className="art-seal">
                LOCAL
                <br />
                BY NATURE
              </span>
            </div>
          </div>
        </section>
        <div className="principles wrap">
          <span>
            <i aria-hidden="true">01</i> Your images stay on your device
          </span>
          <span>
            <i aria-hidden="true">02</i> No account. Just curiosity.
          </span>
          <span>
            <i aria-hidden="true">03</i> Built for learning, not foraging
          </span>
        </div>
        <section
          className="classifier-section wrap"
          id="classifier"
          aria-labelledby="classifier-title"
        >
          <div className="section-head">
            <div>
              <p className="eyebrow">01 / EXPLORE</p>
              <h2 id="classifier-title">Meet your model.</h2>
            </div>
            <p>
              Bring a mushroom photograph.
              <br />
              See what the network sees.
            </p>
          </div>
          <div className="classifier-grid">
            <div className="upload-panel">
              <div className="panel-heading">
                <h3>Your photograph</h3>
                <span>JPEG · PNG · WebP</span>
              </div>
              <input
                ref={input}
                id="image-upload"
                aria-label="Upload mushroom image"
                className="file-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={busy}
                onChange={(e) => selectFile(e.target.files?.[0])}
              />
              <div
                className={`dropzone ${drag ? "dragging" : ""} ${file ? "has-image" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!busy) setDrag(true);
                }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDrag(false);
                  if (!busy) selectFile(e.dataTransfer.files[0]);
                }}
              >
                {file && preview ? (
                  <>
                    <Image
                      src={preview}
                      alt="Selected mushroom photograph"
                      width={500}
                      height={360}
                      unoptimized
                    />
                    <div className="image-caption">{file.name}</div>
                  </>
                ) : (
                  <>
                    <div className="upload-symbol">
                      <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
                        <rect
                          x="7"
                          y="9"
                          width="34"
                          height="30"
                          rx="4"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        />
                        <circle
                          cx="17"
                          cy="19"
                          r="3"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        />
                        <path
                          d="m9 34 10-9 7 6 6-6 8 9"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        />
                      </svg>
                    </div>
                    <h4>A closer look starts here</h4>
                    <p>Drop your photograph here, or</p>
                    <button
                      className="button secondary"
                      onClick={() => input.current?.click()}
                    >
                      Choose an image <span aria-hidden="true">+</span>
                    </button>
                    <span className="upload-hint">
                      Up to 16 MB · opaque images · 24 MP maximum
                    </span>
                  </>
                )}
              </div>
              {file && (
                <div className="file-actions">
                  <button
                    disabled={busy}
                    onClick={() => input.current?.click()}
                  >
                    Change image
                  </button>
                  <button disabled={busy} onClick={clear}>
                    Remove
                  </button>
                </div>
              )}
              <button
                className="button primary classify-button"
                onClick={classify}
                disabled={!file || !ready || busy || !!modelError}
              >
                {busy
                  ? "Analyzing on your device…"
                  : file && !ready
                    ? "Waiting for model…"
                    : "Classify photograph"}
                <Arrow />
              </button>
              {error && (
                <p role="alert" className="error">
                  {error}
                </p>
              )}
              <p className="privacy">
                <span aria-hidden="true">⌁</span> Private by design. Your
                photograph is never uploaded.
              </p>
            </div>
            <div className="result-panel">
              <div className="panel-heading">
                <h3>The model’s perspective</h3>
                <span className="small-label">BINARY CLASSIFIER</span>
              </div>
              <div className="model-status" role="status" aria-live="polite">
                <span className={`dot ${ready ? "" : "loading-dot"}`} />
                {modelError ? "Model unavailable" : status}
                {!ready && !modelError && progress > 0 && ` · ${progress}%`}
              </div>
              {modelError ? (
                <div className="model-error">
                  <p role="alert">{modelError}</p>
                  <button className="button secondary" onClick={startWorker}>
                    Retry loading
                  </button>
                </div>
              ) : result ? (
                <div className="results" aria-live="polite">
                  <p className="eyebrow">PREDICTED CLASS</p>
                  <h4 data-testid="prediction">
                    {result.score > 0.5 ? "Poisonous" : "Edible"}
                  </h4>
                  <p className="result-context">
                    A model label, never a statement of safety.
                  </p>
                  {[
                    ["Edible", 1 - result.score],
                    ["Poisonous", result.score],
                  ].map(([label, score]) => (
                    <div className="score-row" key={String(label)}>
                      <div>
                        <span>{label}</span>
                        <strong>{(Number(score) * 100).toFixed(2)}%</strong>
                      </div>
                      <meter
                        aria-label={`${label} model score`}
                        min="0"
                        max="1"
                        value={Number(score)}
                      />
                    </div>
                  ))}
                  <p className="score-note">
                    Uncalibrated model scores. These numbers do not measure
                    whether a mushroom is safe to eat.
                  </p>
                  <div className="timing">
                    <span>
                      Inference{" "}
                      <strong>{result.inferenceMs.toFixed(0)} ms</strong>
                    </span>
                    <span>
                      Total processing{" "}
                      <strong>{result.totalMs.toFixed(0)} ms</strong>
                    </span>
                  </div>
                  <output className="sr-only" data-testid="raw-score">
                    {result.score}
                  </output>
                </div>
              ) : (
                <div className={`empty-result ${busy ? "is-busy" : ""}`}>
                  <div className="network-icon" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                  <h4>
                    {busy
                      ? "Finding patterns…"
                      : "A photograph. A new perspective."}
                  </h4>
                  <p>
                    {busy
                      ? "The model is processing your image locally."
                      : "Choose an image and run the classifier to explore its two class scores."}
                  </p>
                  <span className="empty-label">
                    EDIBLE <span aria-hidden="true">/</span> POISONOUS
                  </span>
                </div>
              )}
              <div className="model-footnote">
                <span>EfficientNetB0 · WASM / CPU</span>
                <span>
                  {ready ? `v${ready.version.slice(0, 8)}` : "Preparing model"}
                </span>
              </div>
            </div>
          </div>
          <aside className="safety">
            <span className="safety-icon" aria-hidden="true">
              !
            </span>
            <div>
              <strong>For curiosity. Never for consumption.</strong>
              <p>{safety}</p>
            </div>
          </aside>
        </section>
        <section className="model-section" id="model">
          <div className="wrap">
            <div className="section-head">
              <div>
                <p className="eyebrow">02 / UNDER THE CANOPY</p>
                <h2>Small model. Thoughtful engineering.</h2>
              </div>
              <p>
                From a trained neural network
                <br />
                to an experience in your browser.
              </p>
            </div>
            <div className="model-details">
              <div className="model-intro">
                <h3>
                  Learning the visual
                  <br />
                  language of mushrooms.
                </h3>
                <p>
                  The existing project uses EfficientNetB0 transfer learning to
                  turn visual patterns into a binary classification. We preserve
                  its trained weights, preprocessing and decision threshold.
                </p>
                <a
                  className="text-link"
                  href="https://github.com/buanupgit/mushroom_classifier"
                  target="_blank"
                  rel="noreferrer"
                >
                  Explore the repository <Arrow />
                </a>
              </div>
              <dl className="specs">
                <div>
                  <dt>Architecture</dt>
                  <dd>EfficientNetB0 + classification head</dd>
                </div>
                <div>
                  <dt>Input</dt>
                  <dd>224 × 224 · RGB · float32</dd>
                </div>
                <div>
                  <dt>Preprocessing</dt>
                  <dd>Lanczos resize · pixels ÷ 255</dd>
                </div>
                <div>
                  <dt>Output</dt>
                  <dd>One sigmoid score · threshold &gt; 0.5</dd>
                </div>
                <div>
                  <dt>Runtime</dt>
                  <dd>ONNX · WebAssembly · Web Worker</dd>
                </div>
                <div>
                  <dt>Model download</dt>
                  <dd>
                    {ready
                      ? `${(ready.bytes / 1024 / 1024).toFixed(1)} MiB · cached after first use`
                      : "Loaded independently of this page"}
                  </dd>
                </div>
              </dl>
            </div>
            <div className="pipeline" aria-label="Classification pipeline">
              <div>
                <span>01</span>
                <h4>Your photograph</h4>
                <p>Decoded on your device</p>
              </div>
              <b aria-hidden="true">→</b>
              <div>
                <span>02</span>
                <h4>Prepare the pixels</h4>
                <p>Resize and normalize</p>
              </div>
              <b aria-hidden="true">→</b>
              <div>
                <span>03</span>
                <h4>Find the patterns</h4>
                <p>EfficientNetB0 inference</p>
              </div>
              <b aria-hidden="true">→</b>
              <div>
                <span>04</span>
                <h4>Explore the output</h4>
                <p>Two class scores</p>
              </div>
            </div>
            <div className="honesty-note">
              <h4>A note on evidence</h4>
              <p>
                The original training notebook, dataset provenance and
                evaluation results are unavailable in this repository. Accuracy
                is not claimed. Class labels follow the existing Streamlit app;
                their original training index mapping has not been independently
                verified. The classifier can assign a class even to an unrelated
                image.
              </p>
            </div>
          </div>
        </section>
        <section className="about wrap" id="about">
          <div>
            <p className="eyebrow">03 / FIELD NOTES</p>
            <h2>
              Built to explore.
              <br />
              <em>Shared to learn.</em>
            </h2>
          </div>
          <div>
            <p>
              This project brings an existing TensorFlow mushroom classifier
              from a server-hosted Streamlit app into the browser. It is an
              exploration of the work between training a model and making it
              useful: conversion, numerical validation, image processing and a
              considered interface.
            </p>
            <p>
              The website appears first. The model loads separately, stays on
              your device, and runs in a worker so the interface remains
              responsive. No inference server or account is needed.
            </p>
            <a
              className="text-link"
              href="https://github.com/buanupgit/mushroom_classifier"
              target="_blank"
              rel="noreferrer"
            >
              Follow the project on GitHub <Arrow />
            </a>
          </div>
        </section>
      </main>
      <footer className="wrap">
        <div className="footer-top">
          <a className="brand" href="#">
            <Mushroom />
            <span>
              mushroom<span className="brand-light">atlas</span>
            </span>
          </a>
          <p>A project by Anup &amp; Harith</p>
          <span>Next.js · TypeScript · ONNX</span>
        </div>
        <div className="footer-bottom">
          <span>
            Educational use only. Never use predictions to decide what to eat.
          </span>
          <span>APP v1.0.0</span>
        </div>
      </footer>
    </div>
  );
}

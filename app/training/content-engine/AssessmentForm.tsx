"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import styles from "../training.module.css";

export type PublicQuestion = {
  question: string;
  options: readonly string[];
};

export default function AssessmentForm({
  kind,
  lessonSlug,
  questions,
  initiallyPassed = false,
}: {
  kind: "lesson" | "final";
  lessonSlug?: string;
  questions: readonly PublicQuestion[];
  initiallyPassed?: boolean;
}) {
  const [answers, setAnswers] = useState<number[]>(Array(questions.length).fill(-1));
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<null | {
    passed: boolean;
    score: number;
    maxScore: number;
    percent: number;
    feedback: { correct: boolean; explanation: string }[];
  }>(initiallyPassed ? { passed: true, score: questions.length, maxScore: questions.length, percent: 100, feedback: [] } : null);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (answers.some((answer) => answer < 0)) {
      setMessage("Answer every question before submitting.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/training/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, lessonSlug, answers }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The assessment could not be graded.");
      setResult(data);
      setMessage(data.passed ? "Passed. Your result is saved." : "Not passed yet. Review the feedback and try again.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The assessment could not be graded.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={styles.assessmentForm} onSubmit={submit}>
      {questions.map((question, questionIndex) => (
        <fieldset key={question.question} className={styles.questionCard}>
          <legend>{questionIndex + 1}. {question.question}</legend>
          {question.options.map((option, optionIndex) => (
            <label key={option}>
              <input
                type="radio"
                name={`question-${questionIndex}`}
                checked={answers[questionIndex] === optionIndex}
                onChange={() => setAnswers((current) => current.map((answer, index) => index === questionIndex ? optionIndex : answer))}
              />
              <span>{option}</span>
            </label>
          ))}
          {result?.feedback[questionIndex] ? (
            <p className={result.feedback[questionIndex].correct ? styles.correct : styles.incorrect}>
              {result.feedback[questionIndex].correct ? "Correct. " : "Review this one. "}
              {result.feedback[questionIndex].explanation}
            </p>
          ) : null}
        </fieldset>
      ))}
      <div className={styles.assessmentActions}>
        <button type="submit" disabled={busy}>{busy ? "Grading..." : kind === "final" ? "Submit final assessment" : "Check my answers"}</button>
        {result ? <strong>{result.score} of {result.maxScore} correct. {result.percent} percent.</strong> : null}
      </div>
      <p aria-live="polite" className={styles.assessmentMessage}>{message}</p>
      {kind === "final" && result?.passed ? (
        <Link className="cb-btn cb-btn--primary" href="/training/content-engine/credential">Request completion letter</Link>
      ) : null}
    </form>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface AiResult {
  activityId: string;
  summary: string[];
  qualificationScore: number;
  scoreReasoning: string;
  nextBestAction: string;
  draftLineReply: string;
  isFallback: boolean;
}

export function AiCopilotPanel({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [result, setResult] = useState<AiResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [decision, setDecision] = useState<'APPROVED' | 'DISCARDED' | null>(null);
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestAnalysis() {
    setLoading(true);
    setError(null);
    setResult(null);
    setDecision(null);
    try {
      const res = await fetch(`/api/leads/${leadId}/ai-copilot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(simulateFailure ? { 'x-simulate-ai-failure': 'true' } : {}),
        },
        body: JSON.stringify({}),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        setError(body.message ?? 'AI request failed');
        return;
      }
      setResult(body.data);
    } finally {
      setLoading(false);
    }
  }

  async function respond(action: 'approve' | 'discard') {
    if (!result) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/ai-copilot/${result.activityId}/${action}`, { method: 'POST' });
      const body = await res.json();
      if (!res.ok || !body.success) {
        setError(body.message ?? `Could not ${action}`);
        return;
      }
      setDecision(action === 'approve' ? 'APPROVED' : 'DISCARDED');
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">AI Copilot</h2>
        <label className="flex items-center gap-1.5 text-xs text-gray-500">
          <input type="checkbox" checked={simulateFailure} onChange={(e) => setSimulateFailure(e.target.checked)} />
          Simulate AI outage (demo)
        </label>
      </div>

      <button
        type="button"
        onClick={requestAnalysis}
        disabled={loading}
        className="mt-3 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {loading && !result ? 'Analyzing…' : 'Ask AI Copilot'}
      </button>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {result && (
        <div className="mt-4 space-y-3 rounded-md border border-gray-100 bg-gray-50 p-4 text-sm">
          {result.isFallback && (
            <p className="rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
              Fallback result — AI provider unavailable, showing heuristic default.
            </p>
          )}
          <div>
            <p className="font-medium text-gray-700">Summary</p>
            <ul className="list-inside list-disc text-gray-600">
              {result.summary.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
          <p><span className="font-medium text-gray-700">Score:</span> {result.qualificationScore}/100 — {result.scoreReasoning}</p>
          <p><span className="font-medium text-gray-700">Next best action:</span> {result.nextBestAction}</p>
          <div>
            <p className="font-medium text-gray-700">Draft LINE reply</p>
            <p className="rounded bg-white p-2 text-gray-800">{result.draftLineReply}</p>
          </div>

          {!decision ? (
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => respond('approve')}
                disabled={loading}
                className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
              >
                Approve &amp; Send
              </button>
              <button
                type="button"
                onClick={() => respond('discard')}
                disabled={loading}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 disabled:opacity-50"
              >
                Discard
              </button>
            </div>
          ) : (
            <p className="pt-2 text-xs font-medium text-gray-500">Suggestion {decision.toLowerCase()}.</p>
          )}
        </div>
      )}
    </div>
  );
}

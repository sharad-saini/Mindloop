import React, { useState } from "react";
import confetti from "canvas-confetti";
import { 
  Award, 
  ShieldCheck, 
  Download, 
  Printer, 
  Copy, 
  Check, 
  ExternalLink, 
  Sparkles, 
  CheckCircle2, 
  Search,
  BookOpen
} from "lucide-react";
import type { MasteryCertificate, LearningTrack, SpacedRepetitionProgress } from "../types";

interface CertificatesViewProps {
  certificates: MasteryCertificate[];
  tracks: LearningTrack[];
  progressMap: Record<string, SpacedRepetitionProgress>;
  userName: string;
  onIssueCertificate: (track: LearningTrack, score: number) => void;
}

export const CertificatesView: React.FC<CertificatesViewProps> = ({
  certificates,
  tracks,
  progressMap,
  userName,
  onIssueCertificate,
}) => {
  const [selectedCert, setSelectedCert] = useState<MasteryCertificate | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [verificationInput, setVerificationInput] = useState("");
  const [verificationResult, setVerificationResult] = useState<{
    found: boolean;
    cert?: MasteryCertificate;
  } | null>(null);

  const getTrackMastery = (track: LearningTrack) => {
    if (track.concepts.length === 0) return 0;
    let totalScore = 0;
    track.concepts.forEach(c => {
      const p = progressMap[c.id];
      if (p) {
        totalScore += (p.masteryLevel / 5) * 100;
      }
    });
    return Math.round(totalScore / track.concepts.length);
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const query = verificationInput.trim().toUpperCase();
    if (!query) return;

    const match = certificates.find(c => c.verificationCode.toUpperCase() === query);
    if (match) {
      setVerificationResult({ found: true, cert: match });
    } else {
      setVerificationResult({ found: false });
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-6 sm:py-8 px-4 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Mastery Credentials
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold">
              Cryptographically Verifiable
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            Official proof of active recall proficiency and repaired mental model competency.
          </p>
        </div>

        {/* Verification Widget */}
        <form onSubmit={handleVerify} className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Verify Code (e.g. ML-...)"
            value={verificationInput}
            onChange={e => setVerificationInput(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 uppercase tracking-wider focus:outline-none focus:border-amber-500 font-mono"
          />
          <button
            type="submit"
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-colors"
          >
            Verify
          </button>
        </form>
      </div>

      {/* Verification Query Result Banner */}
      {verificationResult && (
        <div className={`p-4 rounded-xl border text-sm flex items-start justify-between gap-3 ${
          verificationResult.found 
            ? "bg-emerald-950/40 border-emerald-500/60 text-emerald-200" 
            : "bg-rose-950/40 border-rose-500/60 text-rose-200"
        }`}>
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">
                {verificationResult.found ? "Verified Authentic Credential" : "Verification Failed"}
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {verificationResult.found 
                  ? `Issued to ${verificationResult.cert?.userName} for completing "${verificationResult.cert?.trackTitle}" with ${verificationResult.cert?.masteryScore}% mastery score.`
                  : "No certificate found matching this verification code in the verifiable registry."}
              </p>
            </div>
          </div>
          <button
            onClick={() => setVerificationResult(null)}
            className="text-xs text-slate-400 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Issued Certificates Grid */}
      <div className="space-y-4">
        <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-400" />
          Your Issued Certificates ({certificates.length})
        </h2>

        {certificates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {certificates.map(cert => (
              <div
                key={cert.certificateId}
                className="bg-gradient-to-br from-slate-900/80 via-slate-900/50 to-slate-950 border border-amber-500/30 rounded-3xl p-6 space-y-4 shadow-xl relative overflow-hidden group hover:border-amber-500/60 transition-all"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-widest text-amber-400">
                        Certificate of Mastery
                      </div>
                      <h3 className="text-base font-bold text-white">
                        {cert.trackTitle}
                      </h3>
                    </div>
                  </div>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {cert.masteryScore}% Score
                  </span>
                </div>

                <div className="text-xs text-slate-400 space-y-1 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 font-mono">
                  <div className="flex justify-between">
                    <span>Issued To:</span>
                    <span className="text-slate-200">{cert.userName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date:</span>
                    <span className="text-slate-200">{new Date(cert.issuedAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Code:</span>
                    <span className="text-amber-400 font-bold">{cert.verificationCode}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                  <button
                    onClick={() => handleCopy(cert.verificationCode)}
                    className="flex items-center gap-1.5 text-slate-400 hover:text-amber-300 transition-colors"
                  >
                    {copiedCode === cert.verificationCode ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setSelectedCert(cert)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-semibold transition-colors"
                  >
                    <span>View & Print</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-slate-800 mx-auto flex items-center justify-center text-amber-400">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-white">
              No certificates earned yet
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Attain 75% or higher mastery across all concepts in a track to claim your official credential.
            </p>
          </div>
        )}
      </div>

      {/* Eligible Track Claims */}
      <div className="space-y-4 pt-4 border-t border-slate-800">
        <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-indigo-400" />
          Track Mastery Eligibility
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tracks.map(track => {
            const mastery = getTrackMastery(track);
            const alreadyIssued = certificates.some(c => c.trackId === track.id);
            const isEligible = mastery >= 100 && !alreadyIssued;

            return (
              <div
                key={track.id}
                className="bg-slate-900/50 border border-slate-800 rounded-3xl p-5 flex items-center justify-between gap-4"
              >
                <div>
                  <h4 className="text-sm font-bold text-white">
                    {track.title}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                    <span>{track.concepts.length} concepts</span>
                    <span>•</span>
                    <span className="text-indigo-400 font-semibold">{mastery}% mastered</span>
                  </div>
                </div>

                <div>
                  {alreadyIssued ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                      <CheckCircle2 className="w-4 h-4" /> Claimed
                    </span>
                  ) : isEligible ? (
                    <button
                      id={`btn-issue-cert-${track.id}`}
                      onClick={() => {
                        onIssueCertificate(track, mastery);
                        try {
                          confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
                        } catch(e) {}
                      }}
                      className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all hover:scale-105"
                    >
                      Claim Certificate
                    </button>
                  ) : (
                    <span className="text-xs text-slate-500">
                      Locked (requires 100% mastery)
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Official Certificate Full-Screen Modal Preview */}
      {selectedCert && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-500/50 rounded-3xl max-w-2xl w-full p-6 sm:p-10 shadow-2xl relative space-y-6 text-center print:bg-white print:text-black">
            <button
              onClick={() => setSelectedCert(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white print:hidden text-lg"
            >
              ✕
            </button>

            {/* Certificate Printable Inner Card */}
            <div className="border-4 border-double border-amber-500/40 p-6 sm:p-8 rounded-2xl bg-slate-950/60 print:bg-white space-y-6">
              <div className="flex items-center justify-center gap-2 text-amber-400">
                <Award className="w-8 h-8" />
                <span className="text-xl font-bold tracking-widest uppercase">
                  MindLoop Academy
                </span>
              </div>

              <div className="space-y-1">
                <p className="text-xs uppercase tracking-widest text-slate-400">
                  Verifiable Certificate of Mastery
                </p>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight pt-1">
                  {selectedCert.userName}
                </h3>
                <p className="text-xs text-slate-400 pt-2 max-w-md mx-auto leading-relaxed">
                  has demonstrated rigorous mastery of conceptual principles, active recall retention, and resolved cognitive misconceptions in:
                </p>
                <div className="text-lg sm:text-xl font-bold text-amber-300 pt-1">
                  {selectedCert.trackTitle}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs font-mono border-t border-slate-800 pt-4 max-w-sm mx-auto">
                <div>
                  <div className="text-slate-500">Issued Date</div>
                  <div className="text-slate-200 font-bold">{new Date(selectedCert.issuedAt).toLocaleDateString()}</div>
                </div>
                <div>
                  <div className="text-slate-500">Mastery Score</div>
                  <div className="text-emerald-400 font-bold">{selectedCert.masteryScore}% Verified</div>
                </div>
              </div>

              <div className="pt-2 text-[11px] font-mono text-slate-400">
                <span>Verification Code: </span>
                <span className="text-amber-400 font-bold select-all">{selectedCert.verificationCode}</span>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-center gap-3 print:hidden">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Print Certificate</span>
              </button>
              <button
                onClick={() => handleCopy(selectedCert.verificationCode)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors"
              >
                <Copy className="w-4 h-4" />
                <span>{copiedCode === selectedCert.verificationCode ? "Copied!" : "Copy Verification Code"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

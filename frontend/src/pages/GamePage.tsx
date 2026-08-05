import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "../contexts/GameContext";
import DrawingCanvas from "../components/canvas/DrawingCanvas";
import ChatPanel from "../components/chat/ChatPanel";
import PlayerList from "../components/game/PlayerList";
import TimerBar from "../components/game/TimerBar";
import WordChooser from "../components/game/WordChooser";
import RoundEndOverlay from "../components/game/RoundEndOverlay";
import { useTimer } from "../hooks/useTimer";
import { getSocket } from "../utils/socket";

export default function GamePage() {
  const navigate = useNavigate();
  const {
    room,
    game,
    playerId,
    currentWord,
    currentHint,
    wordChoices,
    roundEnd,
    gameOver,
    nickname,
    fullReset,
  } = useGame();
  const [showPlayers, setShowPlayers] = useState(false);
  const [skipVotes, setSkipVotes] = useState({ votes: 0, needed: 0 });
  const [hasVotedSkip, setHasVotedSkip] = useState(false);

  useEffect(() => {
    if (!room && !nickname) navigate("/");
  }, [room, nickname, navigate]);

  // Listen for skip vote updates and kick events
  useEffect(() => {
    const socket = getSocket();
    socket.on(
      "skip_vote_update",
      (data: { votes: number; needed: number; triggered: boolean }) => {
        setSkipVotes({ votes: data.votes, needed: data.needed });
        if (data.triggered) setHasVotedSkip(false);
      },
    );
    // Reset skip vote on new round
    socket.on("round_start", () => {
      setSkipVotes({ votes: 0, needed: 0 });
      setHasVotedSkip(false);
    });
    return () => {
      socket.off("skip_vote_update");
    };
  }, []);
  useEffect(() => {
    if (gameOver) navigate(`/game-over/${room?.roomCode}`);
  }, [gameOver, navigate, room]);

  const isDrawer = game?.currentDrawerId === playerId;
  const isDrawing = game?.phase === "drawing";
  const drawTime = game?.drawTime || 80;
  const { timeLeft } = useTimer(
    drawTime,
    isDrawing && !wordChoices,
    game?.roundStartTime,
  );

  if (!room || !game) return null;

  const topBarHeight = 44;

  return (
    <div
      className="flex flex-col bg-game-bg"
      style={{ height: "100dvh", overflow: "hidden" }}
    >
      {wordChoices && <WordChooser />}
      {roundEnd && game.phase === "round_end" && (
        <RoundEndOverlay data={roundEnd} />
      )}

      {/* ── Top bar ── */}
      <div
        className="bg-game-card border-b border-game-border px-3 flex items-center gap-2 shrink-0"
        style={{ height: topBarHeight }}
      >
        <span className="font-game text-game-accent text-base hidden sm:block">
          Skribbl
        </span>
        <span className="text-gray-400 text-xs shrink-0">
          R{(game.currentRound || 0) + 1}/{game.totalRounds}
        </span>

        {isDrawing ? (
          <div className="flex-1 mx-1">
            <TimerBar timeLeft={timeLeft} totalTime={drawTime} />
          </div>
        ) : (
          <div className="flex-1" />
        )}

        {game.currentDrawerName && (
          <span className="text-xs text-gray-300 shrink-0 hidden md:block">
            {isDrawer ? "✏️ You're drawing!" : `✏️ ${game.currentDrawerName}`}
          </span>
        )}

        {/* Skip vote button — shown to non-drawers during drawing */}
        {isDrawing && !isDrawer && (
          <button
            onClick={() => {
              if (hasVotedSkip) return;
              setHasVotedSkip(true);
              getSocket().emit("vote_skip", {});
            }}
            disabled={hasVotedSkip}
            className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs font-bold border transition-all shrink-0 ${
              hasVotedSkip
                ? "border-yellow-700 text-yellow-500 bg-yellow-900/20"
                : "border-game-border text-gray-400 hover:border-yellow-500 hover:text-yellow-400"
            }`}
            title="Vote to skip this drawer"
          >
            ⏭<span className="hidden sm:inline"> Skip</span>
            {skipVotes.needed > 0
              ? ` ${skipVotes.votes}/${skipVotes.needed}`
              : ""}
          </button>
        )}

        {/* Mobile: players toggle only */}
        <button
          onClick={() => setShowPlayers((s) => !s)}
          className={`lg:hidden px-2 py-1.5 rounded text-xs font-bold border transition-all shrink-0 ${
            showPlayers
              ? "bg-game-accent border-game-accent text-white"
              : "border-game-border text-gray-400"
          }`}
        >
          👥
        </button>

        <button
          onClick={() => {
            fullReset();
            navigate("/");
          }}
          className="px-2 py-1.5 rounded text-xs border border-game-border text-gray-400 hover:border-red-500 hover:text-red-400 transition-all shrink-0"
        >
          Exit
        </button>
      </div>

      {/* ── MOBILE (< lg): everything fits the viewport, no page scroll ── */}
      <div className="lg:hidden relative flex-1 min-h-0 flex flex-col gap-1.5 p-2 overflow-hidden">
        {/* Players — overlay sheet so it never pushes the canvas off screen */}
        {showPlayers && (
          <>
            <div
              className="absolute inset-0 z-20 bg-black/50"
              onClick={() => setShowPlayers(false)}
            />
            <div className="absolute z-30 top-0 left-0 right-0 max-h-[70%] overflow-y-auto
                            bg-game-card border-b border-game-border rounded-b-xl p-2 shadow-2xl">
              <PlayerList
                players={game.players}
                currentDrawerId={game.currentDrawerId}
                hostId={room.hostId}
                myId={playerId}
                showScores
              />
              <button
                onClick={() => setShowPlayers(false)}
                className="w-full mt-2 py-2 rounded-lg text-xs font-bold bg-game-border text-gray-300"
              >
                Close
              </button>
            </div>
          </>
        )}

        {/* Canvas + toolbar — takes the larger share, shrinks to fit */}
        <div className="flex-[3] min-h-0 flex flex-col">
          <DrawingCanvas
            isDrawer={isDrawer}
            word={isDrawer ? currentWord : undefined}
            hint={!isDrawer ? currentHint : undefined}
            fitHeight
          />
        </div>

        {/* Chat — always visible, scrolls internally. The drawer needs less of
            it (guesses are hidden from them anyway) so the canvas gets more. */}
        <div
          className={`min-w-0 ${isDrawer ? "flex-1 min-h-[96px]" : "flex-[2] min-h-[132px]"}`}
        >
          <ChatPanel isDrawer={isDrawer} />
        </div>
      </div>

      {/* ── DESKTOP (>= lg): fixed 3-col, everything fits viewport ── */}
      <div className="hidden lg:flex flex-1 gap-2 p-2 min-h-0 overflow-hidden">
        {/* Players sidebar */}
        <div className="w-44 shrink-0 overflow-y-auto">
          <PlayerList
            players={game.players}
            currentDrawerId={game.currentDrawerId}
            hostId={room.hostId}
            myId={playerId}
            showScores
          />
        </div>

        {/* Canvas column — canvas shrinks to fit so the toolbar is always
            on screen without scrolling */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0 overflow-hidden">
          <DrawingCanvas
            isDrawer={isDrawer}
            word={isDrawer ? currentWord : undefined}
            hint={!isDrawer ? currentHint : undefined}
            fitHeight
          />
        </div>

        {/* Chat sidebar */}
        <div className="w-60 xl:w-64 shrink-0 flex flex-col min-h-0 overflow-hidden">
          <ChatPanel isDrawer={isDrawer} />
        </div>
      </div>
    </div>
  );
}

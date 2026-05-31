import React, { useState, useCallback } from 'react';
import StartScreen from './components/StartScreen';
import RuntimeScreen from './components/RuntimeScreen';
import GlobalProvider from './utils/GlobalContext';
import './App.css';
import MinetestArgs from './utils/MinetestArgs';
import { PROXIES } from './utils/common';

export type GameId = 'minetest_game' | 'mineclonia' | 'mineclone2' | 'glitch' | 'blockbomber';

// Define the game options interface
export interface GameOptions {
  language: string;
  proxy: string;
  storagePolicy: string;
  minetestArgs: MinetestArgs;
  mode: 'local' | 'host' | 'join' | 'direct';
  gameId: GameId;
  playerName?: string;
  password?: string;
  joinCode?: string;
  directAddress?: string;
  directPort?: number;
  worldName?: string;
}

const initial_proxy = PROXIES[parseInt(localStorage.getItem('luanti_wasm_selected_proxy') || '0')];

function resolveVibeCoordInitialOptions(): { autoStart: boolean; options: GameOptions } {
  const options: GameOptions = {
    language: 'en',
    proxy: initial_proxy[0],
    storagePolicy: 'indexeddb',
    minetestArgs: new MinetestArgs(),
    mode: 'local',
    gameId: 'minetest_game',
  };

  const params = new URLSearchParams(window.location.search);
  const server = params.get('server') || '';
  const proxy = params.get('proxy') || params.get('wss') || '';
  const gameid = params.get('gameid') as GameId | null;
  const name = params.get('name') || undefined;
  const colon = server.lastIndexOf(':');
  if (colon <= 0 || !proxy) return { autoStart: false, options };

  const directAddress = server.slice(0, colon);
  const directPort = Number.parseInt(server.slice(colon + 1), 10);
  if (!directAddress || !Number.isFinite(directPort) || directPort < 1 || directPort > 65535) {
    return { autoStart: false, options };
  }

  return {
    autoStart: true,
    options: {
      ...options,
      proxy,
      mode: 'direct',
      gameId: gameid === 'mineclonia' || gameid === 'mineclone2' || gameid === 'glitch' || gameid === 'blockbomber'
        ? gameid
        : 'minetest_game',
      playerName: name && /^[A-Za-z0-9_-]{1,20}$/.test(name) ? name : `vc${Math.floor(Math.random() * 9000) + 1000}`,
      directAddress,
      directPort,
    },
  };
}

function App() {
  const initial = resolveVibeCoordInitialOptions();
  const [isGameStarted, setIsGameStarted] = useState(initial.autoStart);
  const [zipLoaderPromise, setZipLoaderPromise] = useState<Promise<Uint8Array> | null>(null);
  const [serverExitTimestamp, setServerExitTimestamp] = useState<Date | null>(null);
  const [gameOptions, setGameOptions] = useState<GameOptions>(initial.options);

  const handleStartGame = useCallback((options: GameOptions) => {
    setGameOptions(options);
    setIsGameStarted(true);
  }, []);
  
  const updateGameOptions = useCallback((options: Partial<GameOptions>) => {
    setGameOptions(prevOptions => ({
      ...prevOptions,
      ...options
    }));
  }, []);

  const handleExitDetected = useCallback((exitCode: number) => {
    console.log('Game exited with code:', exitCode);
    window.location.reload();
  }, []);

  const handleServerExitIntentDetected = useCallback(() => {
    console.log('Server exit intent detected');
    setServerExitTimestamp(new Date());
  }, []);
  
  const handleGameStatus = useCallback((status: 'running' | 'failed') => {
    console.log('handleGameStatus called with status:', status);
    if (status === 'failed') {
      // If game fails to start, go back to start screen
      setIsGameStarted(false);
    }
  }, []);

  return (
    <div className="min-h-screen w-full bg-gray-900 text-white">
      <GlobalProvider
        onExitDetected={handleExitDetected}
        onServerExitIntentDetected={handleServerExitIntentDetected}
      >
        {!isGameStarted ? (
          <StartScreen 
            onStartGame={handleStartGame}
            updateGameOptions={updateGameOptions}
            currentOptions={gameOptions}
            zipLoaderPromise={zipLoaderPromise}
            setZipLoaderPromise={setZipLoaderPromise}
          />
        ) : (
          <RuntimeScreen
            gameOptions={gameOptions}
            onGameStatus={handleGameStatus}
            zipLoaderPromise={zipLoaderPromise}
            serverExitTimestamp={serverExitTimestamp}
          />
        )}
      </GlobalProvider>
    </div>
  );
}

export default App; 

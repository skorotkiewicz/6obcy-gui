import { useEffect, useState, useRef } from 'react';
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import ChatMessages from './components/ChatMessages';
import useWebSocket from 'react-use-websocket';
import './App.scss';

declare global {
  interface Window {
    electron: {
      ipcRenderer: any;
      store: {
        get: (key: string) => any;
        set: (key: string, val: any) => void;
      };
    };
  }
}

function Chat() {
  const [ckey, setCkey] = useState<string>('');
  const [messages, setMessages] = useState<object[]>([]);
  const [userMessage, setUserMessage] = useState<string>('');
  const [typing, setTyp] = useState<string>('');
  const [info, setInfo] = useState<string>('');
  const [count, setCount] = useState<number>(0);
  const [connected, setConnected] = useState<boolean>(false);
  const [myTyping, setMyTyping] = useState<boolean>(false);
  const [captcha, setCaptcha] = useState<string>('');
  const [captchaText, setCaptchaText] = useState<string>('');
  const [welcomeMessage, setWelcomeMessage] = useState<string>('');
  const [isSolved, setIsSolved] = useState<boolean>(false);
  const [reconnect, setReconnect] = useState<boolean>(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState<boolean>(false);
  const [topicCountdown, setTopicCountdown] = useState<number>(0);
  const [connectStatus, setConnectStatus] = useState<number>(0);
  const [proxy, setProxy] = useState<any>('');
  const [proxyState, setProxyState] = useState<number>(0);
  const didUnmount = useRef<boolean>(false);
  const countdown = useRef<any>(null);
  let tcountdown = 0;

  const { sendMessage, readyState } = useWebSocket('ws://localhost:4444', {
    onOpen: () => {
      //startConversation();
    },
    onMessage: (e: any) => {
      _handleSocketMessage(e.data);
      setConnectStatus(readyState);

      const { pingInterval } = parseJson(e.data);
      if (pingInterval > 0) setInterval(() => sendMessage('2'), pingInterval);
    },
    onClose: () => {
      setInfo('');
      setConnected(false);
      setTyp('');
    },
    shouldReconnect: (_closeEvent) => {
      return didUnmount.current === false;
    },
  });

  useEffect(() => {
    const d = setTimeout(() => {
      if (ckey.length > 0) {
        _emitSocketEvent('_mtyp', { ckey: ckey, val: false });
        setMyTyping(false);
      }
    }, 1000);

    return () => clearTimeout(d);
  }, [userMessage]);

  useEffect(() => {
    let myWelcome = window.electron.store.get('welcome');
    let myProxy = window.electron.store.get('proxy');
    if (myWelcome) setWelcomeMessage(myWelcome);
    if (myProxy) {
      setProxy(myProxy);
      setProxyState(1);
    }

    return () => {
      didUnmount.current = true;
    };
  }, []);

  const parseJson = (str: any) => {
    return JSON.parse(str.slice(str.indexOf('{')));
  };

  const startConversation = () => {
    if (connectStatus === 0) return;

    _emitSocketEvent('_sas', {
      channel: 'main',
      myself: {
        sex: 0,
        loc: 0,
      },
      preferences: {
        sex: 0,
        loc: 0,
      },
    });
    setInfo('Szukam rozmówcy...');
    setMessages([]);
  };

  const _emitSocketEvent = (eventName: any, eventData: any) => {
    const eventObj = {
      ev_name: eventName,
      ev_data: eventData,
      ceid: 0,
    };

    const eventStr = `4${JSON.stringify(eventObj)}`;
    sendMessage(eventStr);
  };

  const _handleSocketMessage = (data: any) => {
    const msgData = parseJson(data);

    switch (msgData.ev_name) {
      case 'talk_s':
        _handleConversationStart(msgData);
        break;

      case 'rmsg':
        _handleStrangerMessage(msgData);
        break;

      case 'sdis':
        reconnect ? startConversation() : _handleConversationEnd();
        break;

      case 'cn_acc':
        _handleCN(msgData);
        break;

      case 'capissol':
        _handleResponseCaptcha(msgData);
        break;

      case 'caprecvsas':
        _handleCaptacha(msgData);
        break;

      case 'capchresp':
        _handleCaptacha(msgData);
        break;

      case 'styp':
        _handleStrangerMessageTyp(msgData.ev_data);
        break;

      case 'rtopic':
        _handleRandomQuestion(msgData);
        break;

      case 'count':
        _handleCount(msgData.ev_data);
        break;
    }
  };

  const _handleResponseCaptcha = (msgData: any) => {
    let solved = msgData.ev_data.success;
    setIsSolved(solved);

    if (isSolved === false) NewCaptcha();
  };

  const _handleCaptacha = async (msg: any) => {
    if (msg.ev_data?.wait) {
      setTimeout(() => {
        NewCaptcha();
      }, 1000);
    }

    if (msg.ev_data?.tlce?.data) {
      setCaptcha(msg.ev_data.tlce.data);
    }
  };

  const _handleCN = (msg: any) => {
    _emitSocketEvent('_cinfo', {
      hash: msg.ev_data.hash,
      dpa: true,
      caper: true,
    });

    startConversation();
  };

  const _handleConversationStart = (msgData: any) => {
    _emitSocketEvent('_begacked', {
      ckey: ckey,
    });

    setCkey(msgData.ev_data.ckey);
    setInfo('Połączono z obcym...');
    setConnected(true);

    welcomeMessage && sendUserMessage(welcomeMessage);
  };

  const _handleStrangerMessage = (msgData: any) => {
    const uMsg = msgData.ev_data.msg;

    setMessages((prev) => [...prev, { who: 0, msg: uMsg }]);
    setInfo('');
    setTyp('');
  };

  const _handleConversationEnd = () => {
    setInfo('Rozmowa zakończona...');
    setTyp('');
    setConnected(false);

    setTopicCountdown(0);
    tcountdown = 0;
    clearInterval(countdown.current);
  };

  const _handleCount = (c: any) => {
    setCount(c);
  };

  const _handleRandomQuestion = (msgData: any) => {
    setMessages((prev) => [...prev, { who: 2, msg: msgData.ev_data.topic }]);
  };

  const sendRandTopic = () => {
    if (topicCountdown === 0) {
      setTopicCountdown(60);
      tcountdown = 60;

      countdown.current = setInterval(() => {
        if (tcountdown !== 0) {
          setTopicCountdown((prev) => prev - 1);
          tcountdown = tcountdown - 1;
        } else {
          clearInterval(countdown.current);
        }
      }, 1000);

      _emitSocketEvent('_randtopic', {
        ckey: ckey,
      });
    }
  };

  const sendDisconnect = () => {
    if (confirmDisconnect) {
      _emitSocketEvent('_distalk', {
        ckey: ckey,
      });
      setCkey('');
      setConnected(false);
    } else {
      setConfirmDisconnect(true);

      setTimeout(() => {
        setConfirmDisconnect(false);
      }, 1000);
    }
  };

  const sendUserMessage = (msg: any) => {
    _emitSocketEvent('_pmsg', {
      ckey: ckey,
      msg,
      idn: 0,
    });

    setMessages((prev) => [...prev, { who: 1, msg: msg }]);

    setInfo('');
    setUserMessage('');
  };

  const sendForm = (e: any) => {
    e.preventDefault();

    const uMsg = userMessage;
    sendUserMessage(uMsg);
  };

  const _handleStrangerMessageTyp = (typ: any) => {
    if (typ) {
      setTyp('Obcy pisze...');
    } else {
      setTyp('');
    }
  };

  const textinput = (value: any) => {
    setUserMessage(value);

    if (myTyping === false) {
      _emitSocketEvent('_mtyp', { ckey: ckey, val: true });
      setMyTyping(true);
    }
  };

  const SolveCaptcha = (solved: any) => {
    _emitSocketEvent('_capsol', {
      solution: solved,
    });

    setCaptcha('');
    startConversation();
  };

  const NewCaptcha = () => {
    _emitSocketEvent('_capch', {});
  };

  return (
    <div className="Chat">
      <header>
        <span>6obcy Desktop App</span>
        <span>{connected && 'Połączono'}</span>
        {count ? <span>{count} osób online</span> : <span>łączenie...</span>}
      </header>

      <main>
        <aside>
          <button
            onClick={startConversation}
            disabled={connected || connectStatus === 0}
          >
            Połącz
          </button>
          <button onClick={sendDisconnect} disabled={!connected}>
            {confirmDisconnect ? 'Czy na pewno?' : 'Rozłącz'}
          </button>
          <button onClick={sendRandTopic} disabled={!connected}>
            {topicCountdown !== 0
              ? `Zaczekaj ${topicCountdown} sekund`
              : 'Losowe pytanie'}
          </button>
          <button
            onClick={() => setReconnect((prev) => !prev)}
            disabled={!connected}
          >
            Auto łączenie {reconnect ? 'ON' : 'OFF'}
          </button>
          <div className="autoWelcome">
            <span>Auto wiadomość powitalna</span>
            <input
              type="text"
              value={welcomeMessage}
              placeholder="Treść auto wiadomości"
              onChange={(e) => {
                setWelcomeMessage(e.target.value);
                window.electron.store.set('welcome', e.target.value);
              }}
            />
          </div>

          <div className={connected ? 'connected' : 'infos'}>
            <strong>{info}</strong>
          </div>

          <details>
            <summary>Proxy</summary>
            <div>
              {proxyState === 2 && (
                <div className="proxyInfo">
                  Aby korzystać z proxy, uruchom ponownie aplikację.
                </div>
              )}

              <small>
                <div>
                  <strong>Proszę podać SOCKET5 Proxy.</strong>
                </div>
              </small>
            </div>
            <input
              type="text"
              value={proxy}
              placeholder="100.100.100.100:8080"
              onChange={(e) => setProxy(e.target.value)}
            />
            <button
              onClick={() => {
                window.electron.store.set('proxy', proxy);
                setProxyState(2);
              }}
            >
              Zapisz
            </button>
          </details>
        </aside>
        <div>
          <div className="messages">
            {proxy && proxyState === 1 && (
              <div className="proxyMenu">
                <div>Wykryto ustawienia proxy</div>
                <div>
                  Czy chcesz połączyć się z proxy: <strong>{proxy}</strong>
                  <button
                    onClick={() => {
                      window.electron.ipcRenderer.sendMessage(
                        'proxy',
                        window.electron.store.get('proxy')
                      );
                      setProxyState(0);
                    }}
                  >
                    Połącz z proxy
                  </button>
                  <button
                    onClick={() => {
                      window.electron.ipcRenderer.sendMessage('proxy', null);
                      window.electron.store.set('proxy', null);
                      setProxy(null);
                      setProxyState(0);
                    }}
                  >
                    Nie korzystaj z proxy
                  </button>
                </div>
              </div>
            )}

            {captcha.length > 0 && (
              <div className="captchaMenu">
                <div>Captcha</div>
                <div>
                  <img src={captcha} alt="captcha" />
                </div>

                <div>
                  <input
                    type="text"
                    placeholder="Kod z obrazka (7 znaków)"
                    onChange={(e) => setCaptchaText(e.target.value)}
                  />
                </div>

                <div>
                  <button onClick={() => SolveCaptcha(captchaText)}>
                    Zatwierdź
                  </button>
                </div>
              </div>
            )}

            <ChatMessages messages={messages} />
          </div>
          {typing && <span>Opcy pisze...</span>}
          <footer>
            <form onSubmit={sendForm}>
              <input
                type="text"
                disabled={!connected}
                value={userMessage}
                placeholder="Twoja wiadomość..."
                onChange={(e) => textinput(e.target.value)}
              />
            </form>
          </footer>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Chat />} />
      </Routes>
    </Router>
  );
}

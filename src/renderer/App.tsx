import { useEffect, useState, useRef } from 'react';
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import ChatMessages from './components/ChatMessages';
import ChatInput from './components/ChatInput';
import useWebSocket from 'react-use-websocket';
import './App.scss';

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
  const didUnmount = useRef<boolean>(false);

  const { sendMessage } = useWebSocket('ws://localhost:4444', {
    onOpen: () => {
      //startConversation();
    },
    onMessage: (e: any) => {
      _handleSocketMessage(e.data);

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
    return () => {
      didUnmount.current = true;
    };
  }, []);

  const parseJson = (str: any) => {
    return JSON.parse(str.slice(str.indexOf('{')));
  };

  const startConversation = () => {
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

    welcomeMessage && sendUserMessage(welcomeMessage);
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
  };

  const _handleCount = (c: any) => {
    setCount(c);
  };

  const _handleRandomQuestion = (msgData: any) => {
    setMessages((prev) => [...prev, { who: 2, msg: msgData.ev_data.topic }]);
  };

  const sendRandTopic = () => {
    _emitSocketEvent('_randtopic', {
      ckey: ckey,
    });
  };

  const sendDisconnect = () => {
    _emitSocketEvent('_distalk', {
      ckey: ckey,
    });
    setCkey('');
    setConnected(false);
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
    <>
      <div className="messenger">
        <div className="scrollable sidebar">
          <div className="settings-list">
            <div className="toolbar">
              <div className="left-items">
                <i className="toolbar-button ion-ios-cog"></i>
              </div>
              <h1 className="toolbar-title">6obcy</h1>
              <div className="right-items">
                online <strong> {count}</strong>
              </div>
            </div>

            <div className="settings-list-item">
              <div className="settings-info">
                <h2>Akcje</h2>
                <button onClick={startConversation} disabled={connected}>
                  Połącz
                </button>
                <button onClick={sendDisconnect} disabled={!connected}>
                  Rozłącz
                </button>
                <button onClick={sendRandTopic} disabled={!connected}>
                  Losowe pytanie
                </button>
                <button
                  onClick={() => setReconnect((prev) => !prev)}
                  disabled={!connected}
                >
                  Auto łączenie {reconnect ? 'ON' : 'OFF'}
                </button>

                <div>
                  <h3>Auto wiadomość powitalna</h3>
                  <input
                    type="text"
                    placeholder="Auto wiadomość powitalna"
                    onChange={(e) => setWelcomeMessage(e.target.value)}
                  />
                </div>

                <div className={connected ? 'connected' : 'infos'}>
                  <strong>{info}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="scrollable content">
          <div className="message-list">
            <div className="toolbar">
              <div className="left-items"></div>
              <h1 className="toolbar-title">Rozmowa</h1>
              <div className="right-items">{connected ? 'Połączono' : '.'}</div>
            </div>

            {captcha.length > 0 && (
              <div>
                <p>Captcha</p>
                <p>
                  <img src={captcha} alt="captcha" />
                </p>

                <p>
                  <input
                    type="text"
                    onChange={(e) => setCaptchaText(e.target.value)}
                  />
                </p>

                <p>
                  <button onClick={() => SolveCaptcha(captchaText)}>
                    Zatwierdź
                  </button>
                </p>
              </div>
            )}

            <ChatMessages messages={messages} typing={typing} />
            <ChatInput
              connected={connected}
              sendForm={sendForm}
              userMessage={userMessage}
              setUserMessage={setUserMessage}
              startConversation={startConversation}
              sendDisconnect={sendDisconnect}
              sendRandTopic={sendRandTopic}
              textinput={textinput}
            />
          </div>
        </div>
      </div>
    </>
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

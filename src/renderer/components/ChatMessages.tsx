import { useEffect, useRef } from 'react';
import './ChatMessages.scss';

const ChatMessages = ({ messages, typing }: any) => {
  const divRef = useRef<null | HTMLDivElement>(null);

  useEffect(() => {
    divRef.current?.scrollIntoView({ behavior: 'smooth' });
  });

  return (
    <div className="screen">
      <div className="message-list-container">
        {messages.map((data: any, key: any) => (
          <Message key={key} msg={data.msg} who={data.who} />
        ))}
        <strong>{typing}</strong>
      </div>

      <div ref={divRef}></div>
    </div>
  );
};

const Message = ({ who, msg }: any) => {
  var cl = '';
  if (who === 1) {
    cl = 'mine';
  } else if (who === 2) {
    cl = 'question';
  } else {
    cl = '';
  }

  return (
    <div className={'message start end ' + cl}>
      {/* <div className="timestamp">{who}</div> */}
      <div className="bubble-container">
        <div className="bubble">{msg}</div>
      </div>
    </div>
  );
};

export default ChatMessages;

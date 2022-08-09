import { useEffect, useRef } from 'react';

const ChatMessages = ({ messages }: any) => {
  const divRef = useRef<null | HTMLDivElement>(null);

  useEffect(() => {
    divRef.current?.scrollIntoView({ behavior: 'smooth' });
  });

  return (
    <div>
      {messages.map((data: any, key: number) => (
        <span key={key}>
          <strong style={{ color: data.who === 1 ? 'blue' : 'green' }}>
            {data.who === 1 ? 'Ja: ' : data.who === 2 ? '' : 'Obcy: '}
          </strong>
          {data.who === 2 ? (
            <span style={{ color: 'red' }}>{data.msg}</span>
          ) : (
            data.msg
          )}
          <div ref={divRef}></div>
        </span>
      ))}
    </div>
  );
};

export default ChatMessages;

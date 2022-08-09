import './ChatInput.scss';

const ChatInput = (props: any) => {
  return (
    <form className="compose" onSubmit={props.sendForm}>
      <input
        disabled={!props.connected}
        className="compose-input"
        type="text"
        value={props.userMessage}
        placeholder="Porozmawiaj z nieznajomym... :)"
        onChange={(e) => props.textinput(e.target.value)}
      />
    </form>
  );
};

export default ChatInput;

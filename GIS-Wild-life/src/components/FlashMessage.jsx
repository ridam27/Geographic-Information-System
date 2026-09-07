export function FlashMessage({ message, type }) {
  if (!message) return null;
  return (
    <div className={`flash show ${type === 'ok' ? 'ok' : 'err'}`}>
      {message}
    </div>
  );
}

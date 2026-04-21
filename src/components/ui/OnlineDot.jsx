export default function OnlineDot({ online, size = 10, style = {} }) {
  return (
    <span style={{
      display    : 'inline-block',
      width      : size,
      height     : size,
      borderRadius: '50%',
      background : online ? '#22c55e' : '#D1D5DB',
      border     : '2px solid #fff',
      flexShrink : 0,
      ...style,
    }} title={online ? 'Online' : 'Offline'} />
  );
}

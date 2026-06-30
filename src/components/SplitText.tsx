export function SplitText({ text }: { text: string }) {
  return (
    <span aria-label={text} className="split-text">
      {text.split(' ').map((word, wordIndex) => (
        <span aria-hidden="true" className="split-word" key={`${word}-${wordIndex}`}>
          {word.split('').map((char, charIndex) => (
            <span className="split-char" key={`${char}-${charIndex}`}>
              {char}
            </span>
          ))}
        </span>
      ))}
    </span>
  )
}

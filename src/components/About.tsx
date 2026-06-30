import { SplitText } from './SplitText'

function About() {
  return (
    <section className="about-scene" aria-labelledby="about-title">
      <h2 className="about-title" id="about-title">
        <SplitText text="About" />
      </h2>
      <p className="about-copy">
        I'm a software developer who focuses on building creative fun things that solve my problem and create real value for people. Code to me is a form of self expression.
      </p>
      <div className="about-actions">
        <button className="glass-btn glass-btn--primary" type="button">Work</button>
        <button className="glass-btn glass-btn--secondary" type="button">Contact</button>
      </div>
    </section>
  )
}

export default About

import React from 'react'
import classnames from 'classnames'
import format from 'format-duration'
import { Howl } from 'howler'

import ProgressBar from './progress_bar'
import Icon from './icon'

export default class Player extends React.Component {
  constructor () {
    super()
    this.howl = null
    this.state = {
      track: 'voice',
      recordingURL: '',
      duration: 0,
      progress: 0,
      startMarker: 0,
      playing: false,
      loading: false
    }
    this.handleKeyDown = this.handleKeyDown.bind(this)
  }

  componentDidMount () {
    if (this.props.voiceRecordingURL) {
      this.setState({
        recordingURL: this.recordingURL()
      })
    }
    window.addEventListener('keydown', this.handleKeyDown)
  }

  componentWillUnmount () {
    if (this.animationFrame) window.cancelAnimationFrame(this.animationFrame)
    if (this.howl) this.howl.unload()
    window.removeEventListener('keydown', this.handleKeyDown)
  }

  componentWillReceiveProps (nextProps) {
    if (this.props.voiceRecordingURL !== nextProps.voiceRecordingURL) {
      this.setState({
        recordingURL: this.recordingURL({ props: nextProps })
      })
    }
  }

  componentDidUpdate (prevProps, prevState) {
    if (this.state.recordingURL !== prevState.recordingURL) {
      this.loadRecording(prevProps.voiceRecordingURL === this.props.voiceRecordingURL)
    }
  }

  recordingURL ({ track, props } = {}) {
    return (props || this.props)[`${track || this.state.track}RecordingURL`]
  }

  loadRecording (retainProgress = false) {
    if (this.howl) this.howl.unload()

    let stateReset = {
      loading: true,
      playing: false
    }

    if (!retainProgress) {
      Object.assign(stateReset, {
        duration: 0,
        progress: 0,
        startMarker: 0
      })
    }

    this.setState(stateReset)

    this.howl = new Howl({
      src: [this.state.recordingURL],
      onload: () => {
        this.howl.seek(this.state.progress)
        this.setState({
          loading: false,
          duration: this.howl.duration()
        })
      },
      onplay: () => {
        this.setState({
          playing: true,
          loading: false
        })
        this.step()
      },
      onpause: () => {
        this.setState({
          playing: false,
          loading: false
        })
      }
    })
  }

  step () {
    this.setState({ progress: this.howl.seek() || 0 })

    if (this.howl.playing()) {
      this.animationFrame = window.requestAnimationFrame(this.step.bind(this))
    }
  }

  handleKeyDown (e) {
    if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return
    switch (e.which) {
      case 32:
        this.togglePlay()
        e.preventDefault()
        break
      case 37:
        if (this.howl) {
          this.howl.seek(this.state.startMarker)
          if (!this.state.playing) {
            this.setState({ progress: this.state.startMarker })
          }
        }
        break
    }
  }

  togglePlay (e) {
    if (this.state.playing) {
      this.howl.pause()
    } else {
      this.howl.play()
    }
  }

  onSeek (value) {
    this.setState({
      startMarker: value,
      progress: value
    })
    this.howl.seek(value)
  }

  selectTrack (track) {
    this.setState({
      track: track,
      recordingURL: this.recordingURL({ track })
    })
  }

  classNames (classNames) {
    return classnames(this.props.className, classNames, {
      'player--loading': this.state.loading,
      'player--empty': this.state.recordingURL === ''
    })
  }

  toggleClassNames (t) {
    return classnames('toggle', {
      'toggle--selected': t === this.state.track
    })
  }

  render () {
    if (!this.props.voiceRecordingURL) return null

    return (
      <div className={this.classNames('player u-flex u-flex--horizontal')}>
        <button className='u-flex__panel player__button'
          onClick={this.togglePlay.bind(this)}
          disabled={this.state.loading}
          onKeyUp={(e) => e.preventDefault()}>
          <Icon className='player__button-icon' icon={this.state.playing ? 'pause_circle_filled' : 'play_circle_filled'} />
        </button>
        <div className='player__track-switcher'>
          {['voice', 'full'].map(t => (
            <button key={t}
              className={this.toggleClassNames(t)}
              title={t}
              onClick={this.selectTrack.bind(this, t)}>
              {t.charAt(0)}
            </button>
          ))}
        </div>
        <span className='u-flex__panel player__time'>
          {format(this.state.progress * 1000)}
        </span>
        <ProgressBar className='player__progress u-flex__panel u-flex__panel--grow'
          duration={this.state.duration}
          value={this.state.progress}
          marker={this.state.startMarker}
          onSeek={this.onSeek.bind(this)} />
        <span className='u-flex__panel player__duration'>
          {format(this.state.duration * 1000)}
        </span>
      </div>
    )
  }
}

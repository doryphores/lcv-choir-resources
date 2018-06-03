import React from 'react'
import classnames from 'classnames'
import PDFJS from 'pdfjs-dist'

import KeyCapture from '../key_capture'
import { debounce, range } from '../utils'
import Icon from './icon'

PDFJS.GlobalWorkerOptions.workerSrc = '../../node_modules/pdfjs-dist/build/pdf.worker.js'

export default class Sheet extends React.Component {
  constructor () {
    super()
    this.state = {
      numPages: 0,
      pdfURL: '',
      loading: false
    }

    this.keyCapture = new KeyCapture({
      'pageup pagedown': () => {
        this.refs.scroller.focus()
        return true
      }
    })
  }

  componentDidMount () {
    this.loadPDF(this.props.pdfURL)
    this.onResize = debounce(this.renderPDF.bind(this), 100)
    window.addEventListener('resize', this.onResize)
    this.keyCapture.activate()
  }

  componentWillUnmount () {
    window.removeEventListener('resize', this.onResize)
    this.keyCapture.deactivate()
  }

  componentWillReceiveProps (nextProps) {
    if (this.props.pdfURL !== nextProps.pdfURL) {
      this.loadPDF(nextProps.pdfURL)
    }
  }

  componentDidUpdate (prevProps, prevState) {
    if (
      this.state.pdfURL !== '' &&
      (
        prevState.pdfURL !== this.state.pdfURL ||
        prevState.numPages !== this.state.numPages
      )
    ) {
      this.renderPDF()
    }
  }

  loadPDF (pdfURL) {
    this.setState({
      numPages: 0,
      loading: true
    })

    this.pdfDocument = null

    this.refs.container.parentNode.scrollTop = 0

    PDFJS.getDocument(pdfURL)
      .then(pdfDocument => {
        this.pdfDocument = pdfDocument
        this.pdfDocument.getPage(1).then(pdfPage => {
          let viewport = pdfPage.getViewport(1.0)
          this.setState({
            pdfURL: pdfURL,
            pageRatio: viewport.height / viewport.width,
            numPages: this.pdfDocument.numPages
          })
        })
      }).catch(console.error)
  }

  renderPDF () {
    if (this.state.numPages === 0) return

    Promise.all(range(this.state.numPages).map(i => {
      return this.pdfDocument.getPage(i + 1).then(pdfPage => {
        let viewport = pdfPage.getViewport(1.0)
        let canvas = document.createElement('canvas')
        let scale = this.refs.container.clientWidth / viewport.width
        viewport = pdfPage.getViewport(scale)
        canvas.width = viewport.width
        canvas.height = viewport.height
        return pdfPage.render({
          canvasContext: canvas.getContext('2d'),
          viewport: viewport
        }).then(() => {
          let page = this.refs[`page-${i + 1}`]
          if (page.firstChild) {
            page.firstChild.replaceWith(canvas)
          } else {
            page.appendChild(canvas)
          }
        })
      })
    })).then(() => this.setState({ loading: false }))
  }

  classNames (classNames) {
    return classnames(this.props.className, classNames, {
      'sheet--loading': this.state.loading
    })
  }

  render () {
    let paddingBottom = (this.state.pageRatio * 100) + '%'

    return (
      <div className={this.classNames('sheet')}>
        <div className='sheet__scroller' tabIndex='-1' ref='scroller'>
          <div className='sheet__page-container' ref='container'>
            {range(this.state.numPages).map(i => (
              <div key={i}
                ref={`page-${i + 1}`}
                className='sheet__page'
                style={{ paddingBottom }} />
            ))}
          </div>
          <span className='sheet__loading-message'>
            <Icon icon='refresh' className='sheet__loading-icon' />
            <span>LOADING…</span>
          </span>
        </div>
      </div>
    )
  }
}

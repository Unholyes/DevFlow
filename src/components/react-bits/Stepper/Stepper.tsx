import React, { Children, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'

import './Stepper.css'

type RenderStepIndicatorArgs = {
  step: number
  currentStep: number
  onStepClick: (clicked: number) => void
}

export type StepperProps = React.HTMLAttributes<HTMLDivElement> & {
  children: ReactNode
  initialStep?: number
  onStepChange?: (step: number) => void
  /**
   * Return `false` to block completion (keeps the stepper on the last step).
   * Useful when a submit fails validation or the API returns an error.
   */
  onFinalStepCompleted?: () => void | boolean | Promise<void | boolean>
  /**
   * Keeps the step content area at a uniform height across steps (no resizing/jumping).
   * Content can then scroll inside each step.
   */
  uniformContentHeight?: boolean
  stepCircleContainerClassName?: string
  stepContainerClassName?: string
  contentClassName?: string
  footerClassName?: string
  backButtonProps?: React.ButtonHTMLAttributes<HTMLButtonElement>
  nextButtonProps?: React.ButtonHTMLAttributes<HTMLButtonElement>
  backButtonText?: string
  nextButtonText?: string
  completeButtonText?: string
  disableStepIndicators?: boolean
  renderStepIndicator?: (args: RenderStepIndicatorArgs) => ReactNode
}

export default function Stepper({
  children,
  initialStep = 1,
  onStepChange = () => {},
  onFinalStepCompleted = () => {},
  uniformContentHeight = false,
  stepCircleContainerClassName = '',
  stepContainerClassName = '',
  contentClassName = '',
  footerClassName = '',
  backButtonProps = {},
  nextButtonProps = {},
  backButtonText = 'Back',
  nextButtonText = 'Continue',
  completeButtonText = 'Complete',
  disableStepIndicators = false,
  renderStepIndicator,
  ...rest
}: StepperProps) {
  const [currentStep, setCurrentStep] = useState(initialStep)
  const [direction, setDirection] = useState(0)
  const stepsArray = Children.toArray(children)
  const totalSteps = stepsArray.length
  const isCompleted = currentStep > totalSteps
  const isLastStep = currentStep === totalSteps

  const updateStep = (newStep: number) => {
    setCurrentStep(newStep)
    onStepChange(newStep)
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setDirection(-1)
      updateStep(currentStep - 1)
    }
  }

  const handleNext = () => {
    if (!isLastStep) {
      setDirection(1)
      updateStep(currentStep + 1)
    }
  }

  const handleComplete = async () => {
    setDirection(1)
    const res = await onFinalStepCompleted()
    if (res === false) return
    setCurrentStep(totalSteps + 1)
  }

  return (
    <div className="rb-stepper__outer-container" {...rest}>
      <div
        className={`rb-stepper__step-circle-container ${stepCircleContainerClassName}`}
        style={{ border: '1px solid #222' }}
      >
        <div className={`rb-stepper__step-indicator-row ${stepContainerClassName}`}>
          {stepsArray.map((_, index) => {
            const stepNumber = index + 1
            const isNotLastStep = index < totalSteps - 1
            return (
              <React.Fragment key={stepNumber}>
                {renderStepIndicator ? (
                  renderStepIndicator({
                    step: stepNumber,
                    currentStep,
                    onStepClick: (clicked) => {
                      setDirection(clicked > currentStep ? 1 : -1)
                      updateStep(clicked)
                    },
                  })
                ) : (
                  <StepIndicator
                    step={stepNumber}
                    disableStepIndicators={disableStepIndicators}
                    currentStep={currentStep}
                    onClickStep={(clicked) => {
                      setDirection(clicked > currentStep ? 1 : -1)
                      updateStep(clicked)
                    }}
                  />
                )}
                {isNotLastStep && <StepConnector isComplete={currentStep > stepNumber} />}
              </React.Fragment>
            )
          })}
        </div>

        <StepContentWrapper
          isCompleted={isCompleted}
          currentStep={currentStep}
          direction={direction}
          steps={stepsArray}
          uniformContentHeight={uniformContentHeight}
          className={`rb-stepper__step-content-default ${uniformContentHeight ? 'rb-stepper__content--uniform' : ''} ${contentClassName}`}
        >
          {stepsArray[currentStep - 1]}
        </StepContentWrapper>

        {!isCompleted && (
          <div className={`rb-stepper__footer-container ${footerClassName}`}>
            <div className={`rb-stepper__footer-nav ${currentStep !== 1 ? 'spread' : 'end'}`}>
              {currentStep !== 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className={`rb-stepper__back-button ${currentStep === 1 ? 'inactive' : ''}`}
                  {...backButtonProps}
                >
                  {backButtonText}
                </button>
              )}
              <button
                type="button"
                onClick={isLastStep ? handleComplete : handleNext}
                className="rb-stepper__next-button"
                {...nextButtonProps}
              >
                {isLastStep ? completeButtonText : nextButtonText}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StepContentWrapper({
  isCompleted,
  currentStep,
  direction,
  children,
  steps,
  uniformContentHeight,
  className,
}: {
  isCompleted: boolean
  currentStep: number
  direction: number
  children: ReactNode
  steps: ReactNode[]
  uniformContentHeight: boolean
  className: string
}) {
  const [parentHeight, setParentHeight] = useState(0)
  const [maxHeight, setMaxHeight] = useState(0)
  const measureRefs = useRef<Array<HTMLDivElement | null>>([])

  const handleHeightReady = (h: number) => {
    setParentHeight(h)
    if (uniformContentHeight) setMaxHeight((prev) => (h > prev ? h : prev))
  }

  useLayoutEffect(() => {
    if (!uniformContentHeight) return
    const heights = measureRefs.current.map((el) => el?.offsetHeight ?? 0)
    const nextMax = Math.max(0, ...heights)
    if (nextMax > 0) setMaxHeight(nextMax)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uniformContentHeight, steps.length])

  return (
    <motion.div
      className={className}
      style={{ position: 'relative', overflow: 'hidden' }}
      animate={{ height: isCompleted ? 0 : uniformContentHeight ? Math.max(maxHeight, parentHeight) : parentHeight }}
      transition={{ type: 'spring', duration: 0.4 }}
    >
      {uniformContentHeight ? (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            visibility: 'hidden',
            pointerEvents: 'none',
            zIndex: -1,
          }}
        >
          {steps.map((step, idx) => (
            <div
              key={idx}
              ref={(el) => {
                measureRefs.current[idx] = el
              }}
            >
              {step}
            </div>
          ))}
        </div>
      ) : null}

      <AnimatePresence initial={false} mode="sync" custom={direction}>
        {!isCompleted && (
          <SlideTransition key={currentStep} direction={direction} onHeightReady={handleHeightReady}>
            {children}
          </SlideTransition>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function SlideTransition({
  children,
  direction,
  onHeightReady,
}: {
  children: ReactNode
  direction: number
  onHeightReady: (height: number) => void
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useLayoutEffect(() => {
    if (containerRef.current) onHeightReady(containerRef.current.offsetHeight)
  }, [children, onHeightReady])

  return (
    <motion.div
      ref={containerRef}
      custom={direction}
      variants={stepVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.4 }}
      style={{ position: 'absolute', left: 0, right: 0, top: 0 }}
    >
      {children}
    </motion.div>
  )
}

const stepVariants = {
  enter: (dir: number) => ({
    x: dir >= 0 ? '-100%' : '100%',
    opacity: 0,
  }),
  center: {
    x: '0%',
    opacity: 1,
  },
  exit: (dir: number) => ({
    x: dir >= 0 ? '50%' : '-50%',
    opacity: 0,
  }),
}

export function Step({ children }: { children: ReactNode }) {
  return <div className="rb-stepper__step-default">{children}</div>
}

function StepIndicator({
  step,
  currentStep,
  onClickStep,
  disableStepIndicators,
}: {
  step: number
  currentStep: number
  onClickStep: (clicked: number) => void
  disableStepIndicators: boolean
}) {
  const status = currentStep === step ? 'active' : currentStep < step ? 'inactive' : 'complete'

  const handleClick = () => {
    if (step !== currentStep && !disableStepIndicators) onClickStep(step)
  }

  return (
    <motion.div
      onClick={handleClick}
      className="rb-stepper__step-indicator"
      style={disableStepIndicators ? { pointerEvents: 'none', opacity: 0.5 } : {}}
      animate={status}
      initial={false}
    >
      <motion.div
        variants={{
          inactive: { scale: 1, backgroundColor: '#222', color: '#a3a3a3' },
          active: { scale: 1, backgroundColor: '#5227FF', color: '#5227FF' },
          complete: { scale: 1, backgroundColor: '#5227FF', color: '#3b82f6' },
        }}
        transition={{ duration: 0.3 }}
        className="rb-stepper__step-indicator-inner"
      >
        {status === 'complete' ? (
          <CheckIcon className="rb-stepper__check-icon" />
        ) : status === 'active' ? (
          <div className="rb-stepper__active-dot" />
        ) : (
          <span className="rb-stepper__step-number">{step}</span>
        )}
      </motion.div>
    </motion.div>
  )
}

function StepConnector({ isComplete }: { isComplete: boolean }) {
  const lineVariants = {
    incomplete: { width: 0, backgroundColor: 'transparent' },
    complete: { width: '100%', backgroundColor: '#5227FF' },
  }

  return (
    <div className="rb-stepper__step-connector">
      <motion.div
        className="rb-stepper__step-connector-inner"
        variants={lineVariants}
        initial={false}
        animate={isComplete ? 'complete' : 'incomplete'}
        transition={{ duration: 0.4 }}
      />
    </div>
  )
}

function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <motion.path
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.1, type: 'tween', ease: 'easeOut', duration: 0.3 }}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 13l4 4L19 7"
      />
    </svg>
  )
}


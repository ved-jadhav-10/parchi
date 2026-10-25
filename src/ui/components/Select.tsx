import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { Icon } from './Icons'

export interface SelectOption<T extends string> {
  value: T
  label: string
}

interface Props<T extends string> {
  label: string
  value: T
  options: SelectOption<T>[]
  onChange: (value: T) => void
  /** Shown while the value is the empty string and no option has an empty value */
  placeholder?: string
}

/**
 * A dropdown that looks like the rest of the app (the browser's own list does not). A button opens a listbox: arrow keys move,
 * Enter or Space chooses, Escape closes, a click anywhere else closes. The label sits above, as on every other field.
 */
export function Select<T extends string>({ label, value, options, onChange, placeholder = 'Choose' }: Props<T>) {
  const uid = useId()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const box = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const current = options.find((o) => o.value === value)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false)
    addEventListener('mousedown', onDown)
    return () => removeEventListener('mousedown', onDown)
  }, [open])

  useEffect(() => {
    if (open) list.current?.children[active]?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  const show = () => {
    setActive(Math.max(0, options.findIndex((o) => o.value === value)))
    setOpen(true)
  }
  const choose = (i: number) => {
    onChange(options[i].value)
    setOpen(false)
  }
  const onKey = (e: KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        show()
      }
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      setOpen(false)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(options.length - 1, a + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(0, a - 1))
    } else if (e.key === 'Home') setActive(0)
    else if (e.key === 'End') setActive(options.length - 1)
    else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      choose(active)
    } else if (e.key === 'Tab') setOpen(false)
  }

  return (
    <div className="field">
      <span className="field__label" id={`${uid}-label`}>
        {label}
      </span>
      <div className="select" ref={box} data-open={open}>
        <button
          type="button"
          className="select__button field__input"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-labelledby={`${uid}-label ${uid}-value`}
          aria-controls={`${uid}-list`}
          aria-activedescendant={open ? `${uid}-o${active}` : undefined}
          onClick={() => (open ? setOpen(false) : show())}
          onKeyDown={onKey}
        >
          <span id={`${uid}-value`} className="select__value" data-placeholder={!current}>
            {current?.label ?? placeholder}
          </span>
          <Icon name="chevron" size={16} />
        </button>
        {open && (
          <ul className="select__list" role="listbox" id={`${uid}-list`} aria-labelledby={`${uid}-label`} ref={list}>
            {options.map((o, i) => (
              <li
                key={o.value}
                id={`${uid}-o${i}`}
                role="option"
                aria-selected={o.value === value}
                data-active={i === active}
                className="select__option"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(i)}
                onMouseEnter={() => setActive(i)}
              >
                <span>{o.label}</span>
                {o.value === value && <Icon name="check" size={16} />}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

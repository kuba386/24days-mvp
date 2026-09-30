import { useState } from 'react';
import { COURSES, type Course, type CourseId } from '../courses';

type Props = {
  course: Course;
  completedOf: (id: CourseId) => number;
  onSwitch: (id: CourseId) => void;
  onRestart: () => void;
};

export function CourseFinish({ course, completedOf, onSwitch, onRestart }: Props) {
  const [confirming, setConfirming] = useState(false);
  const others = COURSES.filter((c) => c.id !== course.id);

  return (
    <section className="card card--congrats">
      <h2 className="card__title">Курс «{course.title}» пройден</h2>
      <p className="card__lead">
        {course.needsHabit
          ? 'Привычку можно продолжать отмечать каждый день — цепочка сохранится. Итоги и заметки ниже.'
          : 'Итоги и твои заметки ниже — там готовый план следующего шага.'}
      </p>

      <div className="finish__label">Что дальше</div>
      <div className="finish__list">
        {others.map((c) => {
          const done = completedOf(c.id);
          return (
            <button key={c.id} type="button" className="finish__option" onClick={() => onSwitch(c.id)}>
              <span className="finish__title">
                {done > 0 ? 'Продолжить' : 'Начать'} «{c.title}»
              </span>
              <span className="finish__desc">
                {done > 0 ? `Пройдено ${done} из ${c.days.length}` : c.description}
              </span>
            </button>
          );
        })}
      </div>

      {confirming ? (
        <div className="finish__confirm">
          <p>Отметки, замеры и заметки этого курса сотрутся. Точно начать заново?</p>
          <div className="finish__confirm-row">
            <button type="button" className="btn btn--danger" onClick={onRestart}>
              Стереть и начать заново
            </button>
            <button type="button" className="btn btn--plain" onClick={() => setConfirming(false)}>
              Отмена
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="link-btn finish__restart" onClick={() => setConfirming(true)}>
          Пройти этот курс заново
        </button>
      )}
    </section>
  );
}

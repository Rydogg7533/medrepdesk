import ScrollWheelPicker from './ScrollWheelPicker';

const HOURS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: String(i + 1),
}));

const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map(
  (m) => ({ value: m, label: m })
);

const PERIODS = [
  { value: 'AM', label: 'AM' },
  { value: 'PM', label: 'PM' },
];

export default function TimeWheelPicker({
  hour,
  minute,
  period,
  onChangeHour,
  onChangeMinute,
  onChangePeriod,
}) {
  return (
    <div className="flex w-full overflow-hidden rounded-lg border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-700">
      <ScrollWheelPicker
        items={HOURS}
        value={hour}
        onChange={onChangeHour}
        className="flex-1 border-r border-gray-200 dark:border-gray-700"
      />
      <ScrollWheelPicker
        items={MINUTES}
        value={minute}
        onChange={onChangeMinute}
        className="flex-1 border-r border-gray-200 dark:border-gray-700"
      />
      <ScrollWheelPicker
        items={PERIODS}
        value={period}
        onChange={onChangePeriod}
        className="w-20"
      />
    </div>
  );
}

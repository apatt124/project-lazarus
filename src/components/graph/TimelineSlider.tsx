import React, { useState, useEffect } from 'react';

interface TimelineEvent {
  date: string;
  event_type: string;
  description: string;
  fact_id: string;
}

interface TimelineSliderProps {
  currentTime: Date;
  events: TimelineEvent[];
  onTimeChange: (date: Date) => void;
}

const getEventIcon = (type: string) => {
  const icons: Record<string, string> = {
    diagnosis: '🏥',
    medication: '💊',
    procedure: '🔬',
    allergy: '⚠️',
    test_result: '📊',
  };
  return icons[type] || '📌';
};

const TimelineSlider: React.FC<TimelineSliderProps> = ({
  currentTime,
  events,
  onTimeChange,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [sliderValue, setSliderValue] = useState(100);

  // Calculate time range
  const now = new Date();
  const earliestEvent = events.length > 0
    ? new Date(Math.min(...events.map(e => new Date(e.date).getTime())))
    : new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); // 1 year ago default

  const timeRange = now.getTime() - earliestEvent.getTime();

  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        setSliderValue((prev) => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 100;
          }
          return prev + 1;
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isPlaying]);

  useEffect(() => {
    const timestamp = earliestEvent.getTime() + (sliderValue / 100) * timeRange;
    onTimeChange(new Date(timestamp));
  }, [sliderValue, earliestEvent, timeRange, onTimeChange]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSliderValue(Number(e.target.value));
    setIsPlaying(false);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <div className="flex items-center gap-4">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="p-2 rounded-full bg-purple-600 text-white hover:bg-purple-700 transition-colors"
        >
          {isPlaying ? '⏸' : '▶️'}
        </button>

        <div className="flex-1">
          <input
            type="range"
            min="0"
            max="100"
            value={sliderValue}
            onChange={handleSliderChange}
            className="w-full timeline-slider"
          />
          
          <div className="flex justify-between text-xs text-gray-600 mt-1">
            <span>{formatDate(earliestEvent)}</span>
            <span className="font-medium text-purple-600">
              {formatDate(currentTime)}
            </span>
            <span>{formatDate(now)}</span>
          </div>

          {/* Event markers */}
          <div className="relative h-6 mt-1">
            {events.map((event) => {
              const eventTime = new Date(event.date).getTime();
              const position = ((eventTime - earliestEvent.getTime()) / timeRange) * 100;
              return (
                <div
                  key={event.fact_id}
                  className="absolute transform -translate-x-1/2 cursor-pointer"
                  style={{ left: `${position}%` }}
                  title={`${event.description} (${formatDate(new Date(event.date))})`}
                >
                  <span className="text-lg">{getEventIcon(event.event_type)}</span>
                </div>
              );
            })}
          </div>
        </div>

        <button
          onClick={() => {
            setSliderValue(100);
            setIsPlaying(false);
          }}
          className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          Now
        </button>
      </div>
    </div>
  );
};

export default TimelineSlider;

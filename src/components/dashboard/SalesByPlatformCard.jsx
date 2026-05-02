import React from 'react';

const platformIconMap = {
  'Facebook': 'pisbok.png',
  'Instagram': 'instagram.png'
};

export default function SalesByPlatformCard({ salesByPlatform }) {
  return (
    <div className="w-full max-w-full rounded-[15px] sm:rounded-[20px] shadow-lg flex flex-col items-center justify-center p-2 sm:p-3 pb-4 h-full xl:aspect-[4/3] xl:max-h-[360px]" style={{ background: 'linear-gradient(135deg, #D1C6F3 0%, #E9BCAC 100%)' }}>
      <div className="flex flex-col justify-center w-full h-full">
        <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-[#280A4F] mb-3 sm:mb-4 md:mb-6 lg:mb-8 text-center">
          SALES BY PLATFORM:
        </h2>
        <div className="flex flex-col space-y-2 sm:space-y-3 md:space-y-4 lg:space-y-6 w-full px-2 sm:px-3 md:px-4 lg:px-6 overflow-y-auto">
          {salesByPlatform.length > 0 ? salesByPlatform.map((platform, i) => (
            <div key={i} className="flex items-center gap-2 sm:gap-3 md:gap-4 lg:gap-6 group">
              <div className="w-[40px] h-[40px] sm:w-[45px] sm:h-[45px] md:w-[50px] md:h-[50px] lg:w-[55px] lg:h-[55px] flex items-center justify-center flex-shrink-0">
                <img
                  src={`/icons/${platformIconMap[platform.name]}`}
                  className="w-[30px] h-[30px] sm:w-[35px] sm:h-[35px] md:w-[40px] md:h-[40px] lg:w-[45px] lg:h-[45px] object-contain"
                  alt={platform.name}
                />
              </div>
              <div className="flex flex-col leading-tight min-w-0 flex-1">
                <div className="text-lg sm:text-xl md:text-2xl font-semibold font-satoshi text-[#280A4F] group-hover:translate-x-2 transition-transform duration-300 truncate">
                  ₱{platform.value.toLocaleString()}
                </div>
              </div>
              <div className="text-xs sm:text-sm md:text-base text-[#280A4F]/80 ml-1 sm:ml-2 leading-tight flex-shrink-0">
                ({platform.name})
              </div>
            </div>
          )) : (
            <div className="text-center text-[#280A4F]/60 text-sm sm:text-base">No sales data available</div>
          )}
        </div>
      </div>
    </div>
  );
}
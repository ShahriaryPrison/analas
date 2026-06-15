export interface InsightDoc {
  description: string;
  useCases: string[];
  fields: Record<string, string>;
}

export interface InsightTypeDef {
  id: string;
  label: string;
  description: string;
  icon: string;
  configFields: {
    key: string;
    label: string;
    placeholder: string;
    options?: { label: string; value: string }[];
    optional?: boolean;
  }[];
  docs?: Record<string, InsightDoc>;
}


export const INSIGHT_TYPES: InsightTypeDef[] = [
  {
    id: "count",
    label: "Count",
    description: "Total number of times an event occurred — all time, single number.",
    icon: "#",
    configFields: [
      { key: "eventName", label: "Event name", placeholder: "user_signup" },
    ],
    docs: {
      en: {
        description: "Shows the total number of times a specific action happened in your app.",
        useCases: [
          "Tracking total signups of all time",
          "Knowing how many times a 'Purchase' button was clicked in total"
        ],
        fields: {
          eventName: "The specific action you want to track (e.g. signup)"
        }
      },
      fa: {
        description: "تعداد کل دفعاتی که یک رویداد یا دکمه خاص در برنامه شما اجرا شده است را نشان می‌دهد.",
        useCases: [
          "مشاهده تعداد کل ثبت‌نام‌ها از ابتدا",
          "دانستن اینکه دکمه خرید در مجموع چند بار کلیک شده است"
        ],
        fields: {
          eventName: "نام رویدادی که می‌خواهید ردیابی کنید (مانند ثبت‌نام یا خرید)"
        }
      }
    }
  },
  {
    id: "trend",
    label: "Trend",
    description: "Event count over time.",
    icon: "↗",
    configFields: [
      { key: "eventName", label: "Event name", placeholder: "user_signup" },
      {
        key: "timeFrame",
        label: "Time frame",
        placeholder: "Select range",
        options: [
          { label: "Last 7 days", value: "7" },
          { label: "Last 30 days", value: "30" },
          { label: "Last 90 days", value: "90" },
        ],
      },
      {
        key: "displayType",
        label: "Display as",
        placeholder: "Select style",
        options: [
          { label: "Bar Chart", value: "bar" },
          { label: "Line Chart", value: "line" },
        ],
      },
    ],
    docs: {
      en: {
        description: "Displays how often an action happens over time (daily, weekly, or monthly) as a line or bar chart. Helps you see if usage is growing or shrinking.",
        useCases: [
          "Checking daily active signups",
          "Monitoring checkout failures day-by-day",
          "Analyzing website visits per week"
        ],
        fields: {
          eventName: "The action to display over time",
          timeFrame: "The date range to show (e.g., last 7, 30, or 90 days)",
          displayType: "Whether to render this as a bar chart or a smooth line graph"
        }
      },
      fa: {
        description: "نشان می‌دهد که یک رویداد در طول زمان (روزانه، هفتگی یا ماهانه) چگونه تغییر کرده است. به شما کمک می‌کند متوجه شوید میزان استفاده در حال رشد است یا کاهش.",
        useCases: [
          "بررسی تعداد ثبت‌نام‌های روزانه",
          "نظارت روزانه روی خطاهای پرداخت",
          "تحلیل بازدیدهای وب‌سایت در هفته گذشته"
        ],
        fields: {
          eventName: "رویدادی که می‌خواهید روند آن را در طول زمان ببینید",
          timeFrame: "بازه زمانی نمایش نمودار (مثلاً ۷، ۳۰ یا ۹۰ روز گذشته)",
          displayType: "نحوه نمایش نمودار به صورت میله‌ای یا خطی"
        }
      }
    }
  },
  {
    id: "breakdown",
    label: "Breakdown",
    description: "Top values for a specific property (e.g. top pages, top browsers).",
    icon: "≡",
    configFields: [
      { key: "eventName", label: "Event name", placeholder: "page_view" },
      { key: "property", label: "Property name", placeholder: "url" },
    ],
    docs: {
      en: {
        description: "Splits a specific action by its details. For example, if the action is 'Page Visit', you can break it down by 'Browser' or 'Country' to see the top values.",
        useCases: [
          "Finding out which browser your visitors use most",
          "Seeing which pages on your site get the most clicks",
          "Identifying where your users are coming from (by Country)"
        ],
        fields: {
          eventName: "The action you want to split and analyze",
          property: "The detail or attribute to group by (e.g., country, browser, device)"
        }
      },
      fa: {
        description: "یک فعالیت یا رویداد خاص را بر اساس جزئیات آن تقسیم‌بندی می‌کند. مثلاً اگر رویداد 'بازدید صفحه' باشد، می‌توانید آن را بر اساس 'مرورگر' یا 'کشور' تفکیک کنید تا ببینید کدام‌یک بیشتر استفاده شده است.",
        useCases: [
          "یافتن اینکه کاربران بیشتر از کدام مرورگر استفاده می‌کنند",
          "دیدن اینکه کدام صفحات سایت بیشترین کلیک را داشته‌اند",
          "شناسایی کشور یا شهر مبدا کاربران"
        ],
        fields: {
          eventName: "رویدادی که می‌خواهید آن را تفکیک کنید",
          property: "ویژگی یا جزئیاتی که می‌خواهید تفکیک بر اساس آن انجام شود (مانند کشور، مرورگر یا دستگاه)"
        }
      }
    }
  },
  {
    id: "multi_trend",
    label: "Comparison",
    description: "Compare multiple event trends side-by-side.",
    icon: "⚔",
    configFields: [
      { key: "eventNames", label: "Events to compare", placeholder: "page_view, signup" },
      {
        key: "timeFrame",
        label: "Time frame",
        placeholder: "Select range",
        options: [
          { label: "Last 7 days", value: "7" },
          { label: "Last 30 days", value: "30" },
          { label: "Last 90 days", value: "90" },
        ],
      },
      {
        key: "displayType",
        label: "Display as",
        placeholder: "Select style",
        options: [
          { label: "Bar Chart", value: "bar" },
          { label: "Line Chart", value: "line" },
        ],
      },
    ],
    docs: {
      en: {
        description: "Compares multiple event trends side-by-side on the same chart. Perfect for seeing how different actions relate to each other over time.",
        useCases: [
          "Comparing 'Signups' versus 'Purchases' over the last month",
          "Looking at 'Add to Cart' next to 'Remove from Cart'"
        ],
        fields: {
          eventNames: "The list of actions to compare, separated by commas (e.g. signup, purchase)",
          timeFrame: "The date range to show (e.g., last 7, 30, or 90 days)",
          displayType: "Render as a comparative bar chart or a multi-line graph"
        }
      },
      fa: {
        description: "روند چند رویداد مختلف را در کنار هم روی یک نمودار مقایسه می‌کند. برای درک ارتباط فعالیت‌های مختلف کاربران با یکدیگر در طول زمان عالی است.",
        useCases: [
          "مقایسه تعداد 'ثبت‌نام‌ها' در مقابل 'خریدها' در ماه گذشته",
          "بررسی روند 'افزودن به سبد خرید' در کنار 'حذف از سبد'"
        ],
        fields: {
          eventNames: "نام رویدادهایی که می‌خواهید مقایسه کنید (با کاما از هم جدا شوند، مثل: signup, purchase)",
          timeFrame: "بازه زمانی نمایش نمودار (مثلاً ۷، ۳۰ یا ۹۰ روز گذشته)",
          displayType: "نحوه نمایش نمودار مقایسه‌ای به صورت میله‌ای یا خطی"
        }
      }
    }
  },
  {
    id: "funnel",
    label: "Funnel",
    description: "Conversion progression through multiple steps.",
    icon: "⬇",
    configFields: [
      { key: "eventSteps", label: "Funnel steps (in order)", placeholder: "page_view, signup, purchase" },
      { key: "distinctId", label: "User ID property", placeholder: "user_id" },
    ],
    docs: {
      en: {
        description: "Measures how many users successfully complete a sequence of steps, and where they drop off. Essential for understanding your conversion rates.",
        useCases: [
          "Analyzing the steps from visiting the site, adding to cart, to purchasing",
          "Tracking how many users start a signup form and finish it",
          "Finding out at which step of onboarding users get stuck"
        ],
        fields: {
          eventSteps: "The sequence of actions users should take, in order and separated by commas (e.g. page_view, add_to_cart, purchase)",
          distinctId: "The unique identifier (like user_id or session_id) to link steps together for the same user"
        }
      },
      fa: {
        description: "اندازه‌گیری می‌کند که چه درصدی از کاربران مراحل متوالی تعریف‌شده را با موفقیت طی کرده‌اند و در کدام مرحله منصرف شده‌اند. برای فهم نرخ تبدیل کسب‌وکار شما حیاتی است.",
        useCases: [
          "تحلیل مراحل خرید: از ورود به سایت، افزودن به سبد خرید، تا نهایی کردن سفارش",
          "بررسی اینکه چه تعداد از کاربران فرم ثبت‌نام را شروع کرده و تا آخر رفتند",
          "یافتن نقطه‌ای که کاربران در مسیر خوش‌آمدگویی یا onboarding متوقف می‌شوند"
        ],
        fields: {
          eventSteps: "ترتیب مراحلی که کاربر باید طی کند (با کاما از هم جدا شوند، مثل: page_view, signup, purchase)",
          distinctId: "شناسه یکتای کاربر (مثل user_id یا session_id) برای اینکه سیستم بفهمد مراحل را یک شخص یکسان انجام داده است"
        }
      }
    }
  },
  {
    id: "metric",
    label: "Metric",
    description: "Advanced aggregations (average, unique count, percentiles).",
    icon: "∑",
    configFields: [
      { key: "eventName", label: "Event name", placeholder: "page_loaded" },
      {
        key: "aggregation",
        label: "Aggregation type",
        placeholder: "Select aggregation",
        options: [
          { label: "Unique Count", value: "uniq" },
          { label: "Average", value: "avg" },
          { label: "Median (P50)", value: "p50" },
          { label: "95th Percentile (P95)", value: "p95" }
        ]
      },
      { key: "property", label: "Target property", placeholder: "user_id, latency_ms" },
      {
        key: "timeFrame",
        label: "Time frame",
        placeholder: "Select range",
        options: [
          { label: "Last 7 days", value: "7" },
          { label: "Last 30 days", value: "30" },
          { label: "Last 90 days", value: "90" },
        ],
      },
      {
        key: "displayType",
        label: "Display as",
        placeholder: "Select style",
        options: [
          { label: "Bar Chart", value: "bar" },
          { label: "Line Chart", value: "line" },
          { label: "Big Number", value: "number" },
        ],
      },
    ],
    docs: {
      en: {
        description: "Calculates advanced numbers like averages, uniqueness, or percentiles for a specific action property. Perfect for measuring performance or values.",
        useCases: [
          "Calculating the average purchase amount ($) per order",
          "Finding the 95th percentile page load speed (latency)",
          "Counting unique users who visited a page"
        ],
        fields: {
          eventName: "The action you want to calculate metrics for",
          aggregation: "How to calculate the value: Average (mean), Unique Count, Median (P50), or P95 (95% of users had this speed or lower)",
          property: "The numeric attribute to measure (e.g., price, loading_time)",
          timeFrame: "The date range to show (e.g., last 7, 30, or 90 days)",
          displayType: "Show as a chart over time or a single prominent number"
        }
      },
      fa: {
        description: "محاسبات پیشرفته‌ای مثل میانگین، مقادیر یکتا یا درصدی (پرنتیل) را روی ویژگی‌های یک رویداد خاص انجام می‌دهد. برای اندازه‌گیری کارایی یا مبالغ عالی است.",
        useCases: [
          "محاسبه میانگین مبلغ خریدهای انجام‌شده",
          "پیدا کردن سرعت لود شدن صفحات برای ۹۵ درصد کاربران (P95)",
          "شمارش کاربران یکتایی که از یک صفحه بازدید کرده‌اند"
        ],
        fields: {
          eventName: "رویدادی که می‌خواهید محاسبات را روی آن انجام دهید",
          aggregation: "نوع محاسبه: میانگین (Average)، تعداد کاربران یکتا (Unique Count)، میانه (P50) یا صدک ۹۵ام (P95)",
          property: "ویژگی عددی که می‌خواهید محاسبه شود (مثل مبلغ خرید یا مدت زمان لود شدن به میلی‌ثانیه)",
          timeFrame: "بازه زمانی نمایش نمودار (مثلاً ۷، ۳۰ یا ۹۰ روز گذشته)",
          displayType: "نمایش به عنوان نمودار در طول زمان یا فقط به شکل یک عدد بزرگ"
        }
      }
    }
  },
  {
    id: "session_recording",
    label: "Session Replay",
    description: "Record and replay real user sessions to understand behavior and find UX issues.",
    icon: "⏺",
    configFields: [
      { key: "pagePath", label: "Page Path Filter", placeholder: "/dashboard" },
      { key: "distinctId", label: "User ID Filter", placeholder: "user_123" },
    ],
    docs: {
      en: {
        description:
          "Records user sessions as they interact with your app and lets you replay them frame-by-frame to understand real behavior, find friction points, and debug issues. Form inputs are masked by default; enable full-text masking for stricter privacy.",
        useCases: [
          "Understanding why users drop off on the checkout or onboarding page",
          "Reproducing a hard-to-debug UI issue by watching what a specific user did",
          "Auditing real navigation paths through a critical flow",
        ],
        fields: {
          pagePath:
            "Only show recordings from sessions whose first page matched this path (e.g. /checkout). Leave blank to capture all paths.",
          distinctId:
            "Filter the list to recordings from a single user ID. Useful for support or debugging a specific account.",
        },
      },
      fa: {
        description:
          "جلسات کاربران را هنگام تعامل با برنامه ضبط می‌کند و امکان پخش مجدد فریم به فریم را فراهم می‌کند تا رفتار واقعی درک شود، نقاط اصطکاک پیدا شوند و مشکلات دیباگ شوند. فیلدهای ورودی به‌صورت پیش‌فرض پوشانده می‌شوند و برای حریم خصوصی سخت‌گیرانه‌تر می‌توان پوشاندن کل متن را فعال کرد.",
        useCases: [
          "درک اینکه چرا کاربران در صفحه پرداخت یا آنبوردینگ منصرف می‌شوند",
          "بازتولید یک باگ رابط کاربری سخت با تماشای اتفاقات دقیق یک کاربر خاص",
          "بررسی مسیرهای واقعی کاربران در یک جریان مهم",
        ],
        fields: {
          pagePath:
            "فقط ضبط‌هایی که اولین صفحه جلسه با این مسیر مطابقت داشته نمایش داده می‌شود (مثلاً /checkout). خالی بگذارید تا همه مسیرها ضبط شود.",
          distinctId:
            "لیست را به ضبط‌های یک کاربر خاص فیلتر کن. برای پشتیبانی یا دیباگ یک حساب کاربری خاص مفید است.",
        },
      },
    },
  },
  {
    id: "retention",
    label: "Retention",
    description: "Measure how often users return over time after a specific event.",
    icon: "⟳",
    configFields: [
      { key: "startEvent", label: "Start event", placeholder: "page_loaded" },
      { key: "startEventProperty", label: "Start event property (optional)", placeholder: "path", optional: true },
      { key: "startEventValue", label: "Start property value (optional)", placeholder: "/map/v3", optional: true },
      { key: "returnEvent", label: "Return event", placeholder: "page_loaded" },
      { key: "returnEventProperty", label: "Return event property (optional)", placeholder: "path", optional: true },
      { key: "returnEventValue", label: "Return property value (optional)", placeholder: "/map/v3", optional: true },
      { key: "distinctId", label: "Identity property (user_id/session_id)", placeholder: "session_id" },
    ],
    docs: {
      en: {
        description: "Tracks if users return to your app. It counts how many people who did a 'starting' action come back to do a 'returning' action in the following days.",
        useCases: [
          "Measuring if users who sign up come back and visit the app on Day 1, Day 3, or Day 7",
          "Checking if users who buy once purchase again within a week"
        ],
        fields: {
          startEvent: "The initial action the user takes (e.g., signup or download)",
          startEventProperty: "Optional. Property of the starting event to filter by (e.g. 'path').",
          startEventValue: "Optional. The specific value of the start event property to match (e.g. '/map/v3').",
          returnEvent: "The follow-up action they take to show they came back (e.g., login or page_view)",
          returnEventProperty: "Optional. Property of the return event to filter by (e.g. 'path').",
          returnEventValue: "Optional. The specific value of the return event property to match (e.g. '/map/v3').",
          distinctId: "The unique identifier (like user_id or session_id) to match the same user returning"
        }
      },
      fa: {
        description: "میزان بازگشت و وفاداری کاربران را ردیابی می‌کند. این شاخص بررسی می‌کند چه تعداد از افرادی که کار اولیه‌ای را انجام داده‌اند، در روزهای بعدی برای کار دوم بازگشته‌اند.",
        useCases: [
          "سنجش اینکه کاربران پس از ثبت‌نام، در روزهای اول، سوم یا هفتم به برنامه سر می‌زنند یا خیر",
          "بررسی اینکه آیا کسانی که یک بار خرید کرده‌اند، در طول هفته بعد دوباره خرید می‌کنند"
        ],
        fields: {
          startEvent: "رویداد اولیه یا شروع (مانند ثبت‌نام یا دانلود اپلیکیشن)",
          startEventProperty: "اختیاری. ویژگی (Property) رویداد شروع برای فیلتر کردن (مانند 'path').",
          startEventValue: "اختیاری. مقدار مشخصی که فیلد رویداد شروع باید داشته باشد (مانند '/map/v3').",
          returnEvent: "رویداد ثانویه یا بازگشت برای سنجش اینکه کاربر مجدد آمده است (مانند ورود مجدد یا بازدید صفحه)",
          returnEventProperty: "اختیاری. ویژگی (Property) رویداد بازگشت برای فیلتر کردن (مانند 'path').",
          returnEventValue: "اختیاری. مقدار مشخصی که فیلد رویداد بازگشت باید داشته باشد (مانند '/map/v3').",
          distinctId: "شناسه یکتای کاربر (مثل user_id یا session_id) برای تطبیق اینکه همان کاربر قبلی بازگشته است"
        }
      }
    }
  },
];

export function getInsightType(id: string): InsightTypeDef {
  return INSIGHT_TYPES.find((t) => t.id === id) ?? INSIGHT_TYPES[0];
}


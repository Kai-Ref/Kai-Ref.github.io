---
title: "I Accidentally Vibe-Coded the Perfect To-Do List App"
description: "I wanted a simple habit tracker. So, I built the perfect light-weight, local-first app for habits, tasks, reminders, and progress."
pubDate: "2026-07-19"
tags:
  - "Flutter"
  - "Habit Tracker"
  - "Local-First"
  - "Productivity"
readTime: "4 min read"
heroImage: "/img/posts/i-accidentally-vibe-coded-the-perfect-to-do-list-app/best-to-do-list-apps.jpg"
draft: false
---

I wanted a simple place to plan my day. Instead, I built a full habit tracker and ended up with the to-do list app I had been missing. The app is called [Habit Tracker](https://github.com/Kai-Ref/Habit_tracker). It is a small, local-first app for keeping one-time tasks and recurring habits together. It works without an account or an internet connection, and it keeps your data on your device.

## Why I built it

I kept running into the same problem: the tools I tried were either too flexible or not flexible enough.

Notion was great for making tables, but turning those tables into a smooth daily habit tracker took a lot of work. I had to build the rules for recurring habits, reminders, completion history, and statistics myself.

Most to-do apps had the opposite problem. They handled one-time tasks well, but recurring habits often felt like an afterthought. Reminders were limited, and completed work disappeared without leaving much behind.

I wanted one calm workflow for both kinds of work:

> Decide what needs to happen, get a reminder at the right time, mark it done, and see the pattern later.

<figure class="demo-figure" style="--video-width: 240px;">
  <video controls playsinline preload="metadata" aria-label="Screen recording of the Habit Tracker app showing tasks, habits, and progress views">
    <source src="/img/posts/i-accidentally-vibe-coded-the-perfect-to-do-list-app/habit-tracker-demo.mp4" type="video/mp4" />
  </video>
  <figcaption>A quick look at Habit Tracker in action.</figcaption>
</figure>

## What the app does

Habit Tracker puts one-time tasks and recurring habits in the same place. A task can have a due date, or it can stay as a floating task until you are ready to schedule it. A habit can repeat every day, on selected weekdays, on a day of the month, or every 30 days. Overdue tasks stay visible until you finish them, while completed habits build a simple history over time.

The Today screen shows what needs attention now. The Habits screen gives recurring work its own view. The Performance screen shows completed and missed days in a calendar and a few simple charts. Local reminders can also include a `Done` button on Android, so completing a habit does not always require opening the app.

I built the app with Flutter and SQLite. Most of the tricky work was not the interface; it was making dates behave sensibly. What should happen to a monthly habit on the 31st when the month has only 30 days? Should an overdue task appear again every day? How should a completion rate treat a day when no habit was planned? These rules are kept in one place and covered by tests, so the different screens stay in sync.

## What comes next

The next big improvement is making local data easier to move between devices with export, import, and perhaps encrypted backups. I would also like more flexible schedules, pause and snooze options, better reminder controls, and a small home-screen widget. There is room for more personal reflection too, such as notes, goals, and a clearer difference between a missed habit and one that was intentionally skipped.

## Try it or build on it

The project is public and open to try. You can [explore the Habit Tracker repository on GitHub](https://github.com/Kai-Ref/Habit_tracker), run it locally, open an issue, or build on it for your own workflow.

I built this because I wanted a quieter, more useful way to keep track of everyday work. If you have ideas for making it better, I would love to see what you come up with.

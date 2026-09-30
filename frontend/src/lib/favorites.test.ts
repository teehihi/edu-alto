import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  readFavoriteCourses,
  subscribeToFavoriteCourses,
  toggleFavoriteCourse,
  type FavoriteCourse,
} from "./favorites";

const course: FavoriteCourse = {
  id: "course-1",
  slug: "typescript-co-ban",
  title: "TypeScript cơ bản",
  instructor: "Nguyễn An",
  rating: 0,
  reviewCount: 0,
  totalHours: 0,
  lecturesCount: 0,
  level: "Cơ bản",
  price: 299000,
  image: "/images/course.png",
};

describe("favorite courses", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("persists favorites and toggles the same course off", () => {
    expect(toggleFavoriteCourse(course)).toEqual([course]);
    expect(readFavoriteCourses()).toEqual([course]);

    expect(toggleFavoriteCourse(course)).toEqual([]);
    expect(readFavoriteCourses()).toEqual([]);
  });

  it("notifies views in the same tab when the list changes", () => {
    const onChange = vi.fn();
    const unsubscribe = subscribeToFavoriteCourses(onChange);

    toggleFavoriteCourse(course);

    expect(onChange).toHaveBeenCalledTimes(1);
    unsubscribe();
    toggleFavoriteCourse(course);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("ignores invalid stored data", () => {
    window.localStorage.setItem("edualto:favorite-courses", "{invalid");
    expect(readFavoriteCourses()).toEqual([]);
  });
});

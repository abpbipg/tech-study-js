import { getNewsList, getVideoList } from '../api/data';
import { maxNewsNum, maxVideoNum } from '../config/task';
import { mainStore } from '../store';
import { SettingType, TaskType } from '../types';
import { pauseStudyLock, sleep, waitTaskWin } from '../utils';
import { log } from '../utils/log';
import { createTip } from '../utils/tip';
import { closeWin } from '../utils/win';
import { refreshInfo } from './user';

/**
 * @description 读新闻或者看视频
 * @param type :0为新闻,1为视频
 */
async function reading(type: number) {
  // 看文章或者视频
  let time = 1;
  if (type === 0) {
    // 80-100秒后关闭页面, 看文章
    time = ~~(Math.random() * 20 + 80) + 1;
  }
  if (type === 1) {
    // 100-150秒后关闭页面, 看视频
    time = ~~(Math.random() * 50 + 100) + 1;
  }
  // 第一次滚动时间
  let firstTime = time - 2;
  // 第二次滚动时间
  let secendTime = 12;
  // 创建提示
  const tip = createTip('距离关闭页面还剩', time, async (time) => {
    // 暂停锁
    await pauseStudyLock();
    if (time === firstTime) {
      // 滚动
      window.scrollTo(0, 394);
      // 模拟滚动
      const scroll = new Event('scroll', {
        bubbles: true,
      });
      document.dispatchEvent(scroll);
    }
    if (time === secendTime) {
      // 滚动长度
      const scrollLength = document.body.scrollHeight / 2;
      // 滚动
      window.scrollTo(0, scrollLength);
      // 模拟滚动
      const scroll = new Event('scroll', {
        bubbles: true,
      });
      document.dispatchEvent(scroll);
    }
  });
  // 倒计时结束
  await tip.waitCountDown();
  // 清空链接
  if (type === 0) {
    GM_setValue('readingUrl', null);
  } else {
    GM_setValue('watchingUrl', null);
  }
  // 关闭窗口
  closeWin(mainStore.settings[SettingType.SAME_TAB], mainStore.id);
}

/**
 * @description 获取新闻列表
 */
function getNews() {
  return new Promise(async (resolve) => {
    // 需要学习的新闻数量
    const need =
      mainStore.tasks[TaskType.READ].need < maxNewsNum
        ? mainStore.tasks[TaskType.READ].need
        : maxNewsNum;
    log(`剩余 ${need} 个新闻`);
    // 获取重要新闻
    const data = await getNewsList();
    if (data && data.length) {
      // 数量补足需要数量
      while (mainStore.news.length < need) {
        // 随便取
        const randomIndex = ~~(Math.random() * data.length);
        // 新闻
        const item = data[randomIndex];
        // 是否存在新闻
        if (item.dataValid && item.type === 'tuwen') {
          mainStore.news.push(item);
        }
      }
    } else {
      mainStore.news = [];
    }
    resolve('done');
  });
}

/**
 * @description 获取视频列表
 */
function getVideos() {
  return new Promise(async (resolve) => {
    // 需要学习的视频数量
    const need =
      mainStore.tasks[TaskType.WATCH].need < maxVideoNum
        ? mainStore.tasks[TaskType.WATCH].need
        : maxVideoNum;
    log(`剩余 ${need} 个视频`);
    // 获取重要视频
    const data = await getVideoList();
    if (data && data.length) {
      // 数量补足需要数量
      while (mainStore.videos.length < need) {
        // 随便取
        const randomIndex = ~~(Math.random() * data.length);
        // 视频
        const item = data[randomIndex];
        // 是否存在视频
        if (
          item.dataValid &&
          (item.type === 'shipin' || item.type === 'juji')
        ) {
          mainStore.videos.push(item);
        }
      }
    } else {
      mainStore.videos = [];
    }
    resolve('done');
  });
}

/**
 * @description 阅读文章
 */
async function readNews() {
  await getNews();
  for (const i in mainStore.news) {
    // 暂停
    await pauseStudyLock();
    log(`正在阅读第 ${Number(i) + 1} 个新闻...`);
    // 创建提示
    createTip(`正在阅读第 ${Number(i) + 1} 个新闻`);
    // 链接
    const { url } = mainStore.news[i];
    // 链接
    GM_setValue('readingUrl', url);
    // 等待任务窗口
    await waitTaskWin(url, '文章选读');
    // 创建提示
    createTip(`完成阅读第 ${Number(i) + 1} 个新闻!`);
    // 等待一段时间
    await sleep(1500);
    // 刷新数据
    await refreshInfo();
    // 任务完成跳出循环
    if (
      mainStore.settings[SettingType.READ] &&
      mainStore.tasks[TaskType.READ].status
    ) {
      break;
    }
  }
  // 任务完成状况
  if (
    mainStore.settings[SettingType.READ] &&
    !mainStore.tasks[TaskType.READ].status
  ) {
    log('任务未完成, 继续阅读新闻!');
    // 创建提示
    createTip('任务未完成, 继续阅读新闻!');
    await readNews();
  }
}

/**
 * @description 观看视频
 */
async function watchVideo() {
  // 获取视频
  await getVideos();
  // 观看视频
  for (const i in mainStore.videos) {
    // 暂停
    await pauseStudyLock();
    log(`正在观看第 ${Number(i) + 1} 个视频...`);
    // 创建提示
    createTip(`正在观看第 ${Number(i) + 1} 个视频`);
    // 链接
    const { url } = mainStore.videos[i];
    // 链接
    GM_setValue('watchingUrl', url);
    // 等待任务窗口
    await waitTaskWin(url, '视听学习');
    // 创建提示
    createTip(`完成观看第 ${Number(i) + 1} 个视频!`);
    // 等待一段时间
    await sleep(1500);
    // 刷新数据
    await refreshInfo();
    // 任务完成跳出循环
    if (
      mainStore.settings[SettingType.WATCH] &&
      mainStore.tasks[TaskType.WATCH].status
    ) {
      break;
    }
  }
  // 任务完成状况
  if (
    mainStore.settings[SettingType.WATCH] &&
    !mainStore.tasks[TaskType.WATCH].status
  ) {
    log('任务未完成, 继续观看视频!');
    // 创建提示
    createTip('任务未完成, 继续观看看视频!');
    await watchVideo();
  }
}

export { readNews, watchVideo, reading };

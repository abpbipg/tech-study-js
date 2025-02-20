import URL_CONFIG from '../config/url';
import { mainStore } from '../store';
import { SettingType } from '../types';
import { $$ } from '../utils/element';
import { generateMix } from '../utils/random';

/**
 * @description 打开窗口
 * @param url
 * @returns
 */
async function openFrame(url: string, title?: string) {
  const conn = $$('.egg_frame_wrap')[0];
  if (conn) {
    // 标题
    const frameTitle = $$('.egg_frame_title', conn)[0];
    // 窗口
    const frame = $$<HTMLIFrameElement>('.egg_frame', conn)[0];
    // 打开
    mainStore.closed = false;
    // id
    const id = generateMix(10);
    // 设置标题
    frameTitle.innerText = title || '';
    // 设置 URL
    frame.src = url;
    // 等待页面加载
    await waitFrameLoaded(frame);
    // 发送窗口 ID
    frame.contentWindow?.postMessage({ id, closed: false }, url);
    return {
      id,
      frame,
    };
  }
}

/**
 * @description 改变窗口可见性
 */
function setFrameVisible(show: boolean) {
  const conn = $$('.egg_frame_wrap')[0];
  const frameBtn = $$('.egg_frame_show_btn')[0];
  if (conn && frameBtn) {
    conn.classList.toggle('hide', !show);
    frameBtn.classList.toggle('hide', show);
  }
}

/**
 * @description 关闭窗口
 */
function closeFrame() {
  const conn = $$('.egg_frame_wrap')[0];
  const frameBtn = $$('.egg_frame_show_btn')[0];
  if (conn && frameBtn) {
    // 隐藏窗口
    conn.classList.add('hide');
    // 隐藏按钮
    frameBtn.classList.add('hide');
    // 标题
    const frameTitle = $$('.egg_frame_title', conn)[0];
    // 窗口
    const frame = $$<HTMLIFrameElement>('.egg_frame', conn)[0];
    // 关闭
    mainStore.closed = true;
    frame.src = '';
    frameTitle.innerText = '';
  }
}

/**
 * @description 等待窗口任务结束
 * @param id
 * @returns
 */
function waitFrameClose(id: string) {
  return new Promise((resolve) => {
    window.addEventListener('message', (msg: MessageEvent) => {
      const { data } = msg;
      if (data.id === id && data.closed) {
        resolve(true);
      }
    });
    setInterval(() => {
      if (mainStore.closed) {
        resolve(true);
      }
    }, 100);
  });
}

// 等待窗口加载
function waitFrameLoaded(iframe: HTMLElement) {
  return new Promise((resolve) => {
    iframe.addEventListener('load', () => {
      resolve(true);
    });
  });
}

/**
 * @description 打开新窗口
 */
function openWin(url: string) {
  return GM_openInTab(url, {
    active: true,
    insert: true,
    setParent: true,
  });
}

/**
 * @description 关闭子窗口
 */
function closeWin() {
  try {
    window.opener = window;
    const win = window.open('', '_self');
    win?.close();
    top?.close();
  } catch (e) {}
}

/**
 * @description 等待窗口关闭
 * @param newPage
 * @returns
 */
function waitWinClose(newPage) {
  return new Promise((resolve) => {
    const doing = setInterval(() => {
      if (newPage.closed) {
        clearInterval(doing); // 停止定时器
        resolve('done');
      }
    }, 1000);
  });
}

/**
 * @description 关闭任务窗口
 */
function closeTaskWin(id?: string) {
  // 同屏任务
  if (mainStore.settings[SettingType.SAME_TAB]) {
    window.parent.postMessage({ id, closed: true }, URL_CONFIG.homeOrigin);
    return;
  }
  // 子窗口
  closeWin();
}

/**
 * @description 打开并等待任务结束
 */
async function waitTaskWin(url: string, title?: string) {
  if (mainStore.settings[SettingType.SAME_TAB]) {
    // 显示窗体
    setFrameVisible(!mainStore.settings[SettingType.SILENT_RUN]);
    const newFrame = await openFrame(url, title);
    if (newFrame) {
      // id
      const { id } = newFrame;
      // 等待窗口关闭
      await waitFrameClose(id);
    }
  } else {
    // 页面
    const newPage = openWin(url);
    await waitWinClose(newPage);
  }
}

export {
  openFrame,
  closeFrame,
  waitFrameClose,
  waitFrameLoaded,
  setFrameVisible,
  closeTaskWin,
  waitTaskWin,
};

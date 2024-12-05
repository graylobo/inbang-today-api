import { Injectable } from '@nestjs/common';
import { chromium } from 'playwright';

@Injectable()
export class CrawlerService {
  async getBroadcasts() {
    return 'broadcasts';
  }
  async getAfreecaInfo() {
    console.time('getAfreecaInfo');

    const browser = await chromium.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      page.setDefaultTimeout(0);
      await page.goto('https://www.sooplive.co.kr/');

      // 더보기 버튼 45번 클릭
      //   for (let i = 0; i < 45; i++) {
      //     await page.locator('div.btn-more > button').waitFor();
      //     await page.locator('div.btn-more > button').click();
      //   }

      // XPath 대신 CSS 선택자 사용 (성능상 이점)
      const idElements = await page
        .locator('#broadlist_area ul li .cBox-info div a[user_id]')
        .all();
      const titleElements = await page
        .locator('#broadlist_area ul li .cBox-info h3 a')
        .all();
      const viewersElements = await page
        .locator('#broadlist_area ul li .cBox-info div span em')
        .all();
      const imgElements = await page
        .locator('#broadlist_area ul li .thumbs-box a')
        .all();

      console.log(
        'idList',
        idElements.length,
        'titleList',
        titleElements.length,
        'imgList',
        imgElements.length,
      );

      // 길이 검증
      if (
        ![idElements.length, titleElements.length, imgElements.length].every(
          (v, i, a) => v === a[0],
        )
      ) {
        throw new Error('idList, titleList, imgList length 불일치');
      }

      if (idElements.length < 500) {
        throw new Error('전체방송 수집실패: ' + idElements.length);
      }

      // 병렬로 데이터 수집 (성능 개선)
      const idArr = await Promise.all(
        idElements.map((el) => el.getAttribute('user_id')),
      );

      const titleArr = await Promise.all(
        titleElements.map((el) => el.getAttribute('title')),
      );

      const viewersArr = await Promise.all(
        viewersElements.map((el) => el.textContent()),
      );

      const imgArr = await Promise.all(
        imgElements.map(async (el) => {
          try {
            const imgElement = await el.locator('img');
            if ((await imgElement.count()) === 0) {
              return el.textContent();
            }
            return imgElement.getAttribute('src');
          } catch {
            return el.textContent();
          }
        }),
      );

      // 결과 객체 생성
      const afreecaInfo = idArr.reduce(
        (acc, id, i) => ({
          ...acc,
          [id]: [titleArr[i], imgArr[i], viewersArr[i]],
        }),
        {},
      );

      console.timeEnd('getAfreecaInfo');
      return afreecaInfo;
    } catch (error) {
      throw new Error('getAfreecaInfo에러: ' + error);
    } finally {
      await browser.close();
    }
  }
}

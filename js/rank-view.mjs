import {esc,money,date,icon,top} from './ui.mjs?v=10';
const names={DONG:'Đồng',BAC:'Bạc',VANG:'Vàng',KIMCUONG:'Kim cương'};
const namesOf=x=>names[x]||'Thành viên';
const ranks=['DONG','BAC','VANG','KIMCUONG'];
export function rankView(s){
 const r=s.rank,current=ranks.includes(r.rank)?r.rank:'DONG',applied=ranks.includes(r.bonus_rank)?r.bonus_rank:current;
 const bonus=Number.isFinite(r.bonus_pct)?r.bonus_pct:null;
 const commission=Number.isFinite(r.period?.commission)?Math.max(0,r.period.commission):0;
 const next=ranks.includes(r.progress_to_next?.next_rank)?r.progress_to_next.next_rank:null;
 const goal=Number(r.thresholds?.[next]),eligible=Boolean(next)&&Number.isFinite(goal)&&goal>0;
 const percent=eligible?Math.round(Math.min(100,Math.max(0,commission/goal*100))):current==='KIMCUONG'?100:0;
 const remaining=eligible?Math.max(0,goal-commission):null;
 const month=typeof r.period?.month==='string'?r.period.month.split('-'):null;
 const monthLabel=month?.length===2&&Number(month[1])>=1&&Number(month[1])<=12?'Tháng '+Number(month[1])+'/'+month[0]:'';
 const grace=applied!==current&&r.grace_until?date(r.grace_until):null;
 const levels=ranks.map((key,i)=>{
  const active=current===key,threshold=Number(r.thresholds?.[key]);
  const criteria=key==='DONG'?'Hạng khởi đầu':Number.isFinite(threshold)&&threshold>=0?'Từ '+money(threshold)+' hoa hồng/tháng':'Đang cập nhật';
  return `<li class="member-level member-level--${key.toLowerCase()}${active?' current':''}"${active?' aria-current="step"':''}>
   <span class="member-emblem" aria-hidden="true">${['I','II','III','IV'][i]}</span>
   <span class="member-level-info"><strong>${namesOf(key)}</strong><small>${criteria}</small></span>
   ${active?'<span class="member-current">Hiện tại</span>':''}
  </li>`;
 }).join('');
 return `${top('Quyền lợi thành viên')}
 <div class="member-screen">
  <section class="member-hero member-hero--${current.toLowerCase()}" aria-label="Hạng và quyền lợi hiện tại">
   <div class="member-hero-art" aria-hidden="true"><span class="member-medal">${icon('rank')}</span></div>
   <span class="member-eyebrow">HẠNG HIỆN TẠI</span>
   <h2>${namesOf(current)}</h2>
   <div class="member-benefits">
    <div><span class="member-eyebrow">QUYỀN LỢI ĐANG ÁP DỤNG</span><strong>${namesOf(applied)}</strong></div>
    <div class="member-bonus">${bonus!==null?`<strong>+${esc(bonus)}%</strong><small>trên tiền hoàn gốc</small>`:'<small>Đang cập nhật</small>'}</div>
   </div>
   ${grace?`<p class="member-grace">${icon('clock')} Bảo lưu quyền lợi ${namesOf(applied)} đến ${grace}</p>`:''}
  </section>
  <section class="member-progress" aria-labelledby="member-progress-title">
   <div class="member-section-heading"><h2 id="member-progress-title">${eligible?'Tiến tới hạng '+namesOf(next):current==='KIMCUONG'?'Hạng cao nhất':'Tiến trình lên hạng'}</h2><span>${monthLabel}</span></div>
   ${eligible?`<p class="member-progress-key">Còn <strong>${money(remaining)}</strong> để lên hạng ${namesOf(next)}</p>
    <div class="member-progress-track" role="progressbar" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100" aria-label="Tiến trình đạt hạng ${namesOf(next)}"><span style="width:${percent}%"></span></div>
    <div class="member-progress-values"><span>${money(commission)}</span><strong>${money(goal)}</strong></div><p class="member-metric">Hoa hồng Shopee ghi nhận trong tháng</p>`:
    `<p class="member-progress-key">${current==='KIMCUONG'?'Bạn đang ở hạng thành viên cao nhất.':'Tiến trình đang được cập nhật.'}</p>`}
  </section>
  <section class="member-tiers" aria-labelledby="member-tiers-title">
   <div class="member-section-heading"><h2 id="member-tiers-title">Các hạng thành viên</h2></div>
   <ol class="member-levels">${levels}</ol>
  </section>
  <details class="member-explain">
   <summary>Thưởng hạng được tính thế nào? ${icon('chevron')}</summary>
   <p>Thưởng hạng tính trên tiền hoàn gốc và được cộng vào tổng tiền hoàn khi khoản hoàn đủ điều kiện.</p>
   <p>Hạng xét theo hoa hồng Shopee trong tháng, không phải giá trị đơn hàng.</p>
  </details>
 </div>`;
}


# Debug Mobile — Tổng Quan

## Có mấy cách debug mobile với SuperApp?
2 cách: USB + port forwarding, hoặc cùng WiFi + local IP.

## Công cụ nào dùng để debug mobile qua USB?
`chrome://inspect/#devices` trên laptop.

# Debug Mobile — USB Port Forwarding

## Khi dùng port forwarding, phone truy cập FE bằng URL nào?
`http://localhost:3000`.

## Tại sao HMR bị lỗi khi dùng USB debug?
WebSocket của HMR kết nối về `localhost:3000` — trên phone `localhost` là chính phone, không phải laptop.

## `auto://0.0.0.0:0/ws` có nghĩa gì?
WebSocket tự kết nối về host mà page đang được load từ đó.

# Debug Mobile — WiFi Local IP

## Tại sao không dùng `ipconfig` để lấy IP?
`ipconfig` hiển thị tất cả interfaces, dễ nhầm Ethernet IP với WiFi IP.

## IP `192.168.2.1` có phải IP WiFi của laptop không?
Không. Đó là Ethernet static IP. IP WiFi là `192.168.2.26`.

<!-- ## Làm sao phân biệt APIPA và IP thật?
APIPA có dạng `169.254.x.x` — nghĩa là interface không lấy được DHCP lease. -->

## Khi WiFi của laptop hiển thị `169.254.x.x` thì có dùng IP được không? TODO
Không. Phải dùng USB port forwarding thay thế.

## BE cần sửa file nào để nhận connection từ ngoài?
`launchSettings.json` — đổi `applicationUrl` từ `http://localhost:5000` thành `http://0.0.0.0:5000`.

<!-- ## Sau khi BE bind `0.0.0.0:5000`, kiểm tra bằng lệnh nào?
```powershell
netstat -ano | Select-String ":5000"
```
Phải thấy `0.0.0.0:5000 LISTENING`, không phải `127.0.0.1:5000`. -->

<!-- ## FE cần sửa gì để gọi API qua IP?
`.env.development.local`: `REACT_APP_LOCAL_API_URL=http://192.168.2.26:5000`. Bắt buộc restart `npm start` sau khi sửa. -->

<!-- ## BE CORS cần thêm origin nào khi dùng IP?
`http://192.168.2.26:3000` vào `DevelopmentPolicy` trong `Startup.cs`. -->

# Debug Mobile — Firewall

## API vẫn pending dù BE đang listen `0.0.0.0:5000` — nguyên nhân là gì?
Windows Firewall đang block inbound connection từ thiết bị ngoài.
<!-- 
## Kiểm tra firewall rule cho port 5000 bằng lệnh nào?
```powershell
netsh advfirewall show rule name="SuperApp BE 5000"
``` -->
<!-- 
## Test TCP connection tới port 5000 qua IP WiFi bằng lệnh nào?
```powershell
Test-NetConnection -ComputerName 192.168.2.26 -Port 5000
``` -->
<!-- ## TCP connection là gì?
Kết nối được thiết lập giữa 2 thiết bị theo giao thức TCP. Trước khi truyền data, phải qua "3-way handshake": client gửi SYN → server trả SYN-ACK → client gửi ACK. Sau đó data mới được truyền. Đây là lý do TCP đảm bảo tin cậy hơn UDP. -->
## vai trò của TCP ?@
## khi request từ A đến B thì TCP connection được thiết lập à? @
## Test từ laptop thành công nhưng phone vẫn không reach được — tại sao?
Vì test từ laptop tới chính laptop bypass firewall inbound rules. Phone là external device bị chặn bởi firewall.

## Firewall làm sao xác định device là external device?
Dựa vào **IP nguồn** của packet. 
Nếu IP nguồn là `127.0.0.1` hoặc IP của chính máy → internal (local). Nếu IP nguồn khác (ví dụ `192.168.2.50` của phone) → inbound từ external device → firewall apply inbound rules.
## 127.0.0.1 là gì ? @
<!-- ## `LocalFirewallRules: N/A (GPO-store only)` có nghĩa gì?
Local firewall rules bị ignore trên profile đó — chỉ GPO-managed rules mới có hiệu lực. -->
<!-- 
## WiFi profile mặc định là gì và tại sao gây vấn đề?
Profile `Public`. Trên Public, `LocalFirewallRules: N/A` nên local allow rules không có tác dụng. -->
## WiFi profile là gì?
Windows gán một "network profile" cho mỗi mạng WiFi đã từng kết nối: **Public**, **Private**, hoặc **Domain**. Profile xác định mức độ tin cậy → ảnh hưởng đến bộ firewall rules nào được áp dụng cho mạng đó.
## tại sao change to private wifi profile lại giải quyết được vấn đề của mình? ## vấn đề hồi nãy là mobible gửi request đến backend mà pending hoài do firewall chặn do đó là external device có phải không? @
<!-- ## Fix firewall bằng cách nào?
Đổi WiFi sang profile Private:
```powershell
Set-NetConnectionProfile -InterfaceAlias "Wi-Fi" -NetworkCategory Private
```
Cần chạy PowerShell as Administrator. -->
<!-- ## Kiểm tra network profile của WiFi bằng lệnh nào?
```powershell
Get-NetConnectionProfile | Select-Object InterfaceAlias, NetworkCategory
``` -->

# Mạng — IP, Subnet, Gateway

## IP từ `ipconfig` là gì?
Địa chỉ định danh của máy tính trong mạng — giống như số nhà trong một khu phố.

## IP từ `ipconfig` sinh ra từ đâu?
Thường do **DHCP server** (thường là router) cấp phát tự động khi máy kết nối vào mạng.

## IP có thể là static không?
Có. Nếu cấu hình thủ công thì IP không đổi dù restart. Ví dụ `192.168.2.1` (Ethernet) là static IP được cài sẵn trên adapter.

## IP thay đổi khi nào?
- Khi disconnect rồi reconnect vào mạng khác
- Khi DHCP lease hết hạn (thường vài giờ đến vài ngày)
- Khi router restart và cấp lại IP

## Subnet là gì?
Subnet (mạng con) là một dải IP mà các thiết bị trong đó có thể giao tiếp trực tiếp với nhau mà không qua router.

<!-- ## `/24` trong `192.168.2.0/24` có nghĩa gì?
24 bit đầu là phần "địa chỉ mạng", 8 bit sau là phần "địa chỉ thiết bị". Nghĩa là dải IP từ `192.168.2.0` đến `192.168.2.255` — tối đa 254 thiết bị. -->

<!-- ## Giải thích sơ đồ subnet này:
```
192.168.2.0/24
  ├── 192.168.2.1    ← Ethernet static IP (không dùng để debug)
  ├── 192.168.2.26   ← WiFi laptop
  ├── 192.168.2.253  ← Gateway/Router
  └── 192.168.2.???  ← Phone
```
Tất cả đều có prefix `192.168.2.` → cùng subnet → có thể ping nhau trực tiếp. -->

## IP của các thiết bị dùng chung WiFi thì có đặc điểm gì?
Cùng prefix mạng — ví dụ tất cả đều là `192.168.2.x`. Điều này có nghĩa là cùng subnet, có thể giao tiếp trực tiếp với nhau mà không cần đi qua internet.
## Gateway là gì?
Gateway (thường là router) là cổng ra vào của subnet — mọi traffic đi ra ngoài internet đều qua đây. Trong ví dụ trên là `192.168.2.253`.

## Interface là gì (trong route print)?
Interface là card mạng (network adapter) đang được dùng để gửi packet. `192.168.2.26` là IP của WiFi adapter — nghĩa là laptop dùng WiFi để gửi traffic ra ngoài.
## Cho tôi sơ đồ thành phần trong mạng đơn giản?
```
[Internet / ISP]
       |
    [Modem]         ← kết nối với ISP, chuyển tín hiệu
       |
    [Router]  ←──── IP: 192.168.2.253 (gateway)
    /   |   \       cấp IP cho thiết bị qua DHCP, định tuyến traffic
   /    |    \
[Laptop] [Phone] [PC]
WiFi .26  WiFi .50  Cáp .100
```
Tất cả thiết bị trong cùng router → cùng subnet → ping được nhau trực tiếp.
## modem và router là 2 thiết bị vật lí tách rời nhau à?@
## nhiệm vụ chính của modem?@
## nhiệm vụ chính của router là gì?@
## thiết bị cùng router thì luôn có cùng subnet, và và cùng subnet thì luôn ping trực tiếp được phải không?@
## ping trực tiếp là gì? @
## Router ở đây có phải cục mạng vật lý không?
Đúng. Router là thiết bị vật lý mà laptop cắm cáp hoặc kết nối WiFi vào. Nó có IP riêng trong subnet (ví dụ `192.168.2.253`) và có nhiệm vụ định tuyến traffic.

## IP của router là bao nhiêu?
IP của router trong subnet là **gateway IP** — trong trường hợp này là `192.168.2.253`. Đây là IP "phía trong" (LAN). Router còn có IP "phía ngoài" (WAN) để kết nối internet, nhưng ta không cần quan tâm.
## IP của router luôn là `192.168.2.253`?
Không. Tùy cấu hình của từng router. Phổ biến nhất là `192.168.1.1` hoặc `192.168.0.1`. `192.168.2.253` là cấu hình riêng của router này. Để biết IP gateway, chạy `route print` và xem cột Gateway.
## router là gateway à?
## vai trò của gateway?
## tại sao ip mặc định của router lại là các số này: 192.168.1.1` hoặc `192.168.0.1, có ý nghĩa gì không?
## PC dùng cáp Ethernet thì subnet có khác WiFi không?
Có thể khác hoặc giống, tùy cấu hình router. Thông thường trong nhà, cùng router thì cùng subnet dù dùng cáp hay WiFi. Trường hợp này khác vì `192.168.2.1` (Ethernet) là **static IP cấu hình thủ công**, không phải do router cấp — nên nó tách biệt với WiFi IP `192.168.2.26`.
## subnet của wifi là gì? có phải là ip của router không?
## subnet có phải là 1 phần của ip không?

## DHCP là gì?
Dynamic Host Configuration Protocol — giao thức tự động cấp IP cho thiết bị khi kết nối vào mạng. Thay vì tự điền IP thủ công, thiết bị hỏi DHCP server "cho tôi xin IP" và được cấp phát.

<!-- ## APIPA `169.254.x.x` sinh ra khi nào?
Khi thiết bị không tìm được DHCP server — tự sinh IP tạm để không bị lỗi. IP này chỉ dùng trong máy, không route được ra ngoài. -->

# Mạng — TCP, Firewall, Bind

## TCP là gì?
Transmission Control Protocol — giao thức truyền dữ liệu đảm bảo: gói tin đến đúng thứ tự, không mất mát, có xác nhận. HTTP/HTTPS đều chạy trên TCP.

<!-- ## TCP test (`Test-NetConnection`) là gì?
Thử kết nối TCP tới một IP:port. Nếu thành công (`TcpTestSucceeded: True`) thì cổng đó đang mở và nhận connection. -->

## "Bind" nghĩa là gì?
Bind = gắn process lắng nghe vào một địa chỉ IP cụ thể. `127.0.0.1:5000` = chỉ nhận connection từ chính máy đó. `0.0.0.0:5000` = nhận connection từ mọi IP.
## `127.0.0.1:5000` gọi là gì?
`127.0.0.1` là **loopback address** — hay gọi là `localhost`. Mọi máy đều có địa chỉ này, nó trỏ về chính máy đó. Không phải card mạng vật lý, là interface ảo. Packet gửi tới `127.0.0.1` không ra khỏi máy.
## localhost tương ứng với ip gì?
## 127.0.0.1 có phải là ip không? hay là 1 phần của ip?
## 0.0.0.0:5000 lại nhận connection từ mọi IP ?
vì 0.0.0.0 đại diện cho tất cả network interfaces
## `0.0.0.0` nghĩa là gì?
Đại diện cho "tất cả network interfaces". Khi BE bind `0.0.0.0:5000`, nó lắng nghe trên cả `localhost`, `192.168.2.26`, `192.168.2.1`, và mọi IP khác của máy.
## 1 máy có nhiều IP?
Có. Mỗi **network interface** (card mạng) có 1 IP riêng. Laptop thường có:
- `127.0.0.1` — loopback (luôn có)
- `192.168.2.26` — WiFi adapter
- `192.168.2.1` — Ethernet adapter
- Có thể có thêm: VPN adapter, Docker virtual network, v.v.
## adapter là gì?
## card mạng là gì? nó có phải card vật lí không?
## network interface là gì? gồm những thành phần gì? vai trò?

## nếu pc kết nối ethernet, còn mobile kết nối wifi thì khi dùng chrome inspect k được phải không? vì sao?

## Tại sao Windows Firewall block inbound từ external device?
Đây là hành vi mặc định — bảo vệ máy khỏi kết nối không mong muốn từ bên ngoài. Mọi inbound connection từ device khác đều bị block trừ khi có rule cho phép.

## Local rule là gì?
Rule firewall được tạo thủ công trên máy (qua Windows Defender Firewall hoặc `netsh`). Khác với GPO rule được đẩy xuống từ hệ thống quản trị tập trung.
## Có 2 loại rule chính là local rule và GPO rule phải không?
Đúng về cơ bản. Ngoài ra còn có connection security rules (IPsec), nhưng thực tế dev thường chỉ quan tâm 2 loại này. GPO rule luôn được ưu tiên hơn local rule.
## GPO overwrite local rule phải không?
## it helpdesk tạo gpo, còn user tạo local rule phải không?
## chủ wifi có thể tạo gpo rule không?

## Windows Firewall chỉ đơn giản là tập hợp các local rule + GPO rule?
Về cơ bản đúng. Ngoài ra còn có: default action per profile (block all / allow all), Windows Service Hardening rules (tự động). Nhưng với dev, hiểu "local rule + GPO rule, GPO thắng" là đủ.

## GPO là gì?
Group Policy Object — cơ chế quản lý cấu hình Windows tập trung, thường dùng trong môi trường doanh nghiệp/domain. Admin IT có thể đẩy policy xuống máy người dùng, override local settings.
## So sánh rule và policy?
- **Rule**: điều kiện cụ thể — "allow TCP port 5000 inbound từ mọi IP"
- **Policy (GPO)**: tập hợp nhiều rules + settings, áp dụng cho một nhóm máy/user. GPO là cơ chế đẩy policy xuống, còn firewall rule là 1 trong nhiều thứ GPO có thể cấu hình.
## giải thích từ inbound trong "allow TCP port 5000 inbound từ mọi IP"
## firewall là tập hợp các rule à? hay còn gì khác ?
## rule là thành phần chính của policy phải không?


<!-- 
## Tại sao local firewall rule không có tác dụng trên WiFi profile Public?
Vì GPO đặt `LocalFirewallRules: N/A (GPO-store only)` trên profile Public — chỉ GPO rules mới được đọc, local rules bị bỏ qua hoàn toàn. -->
## trong wifi profile public, local rule bị bỏ qua hoàn toàn à, luôn luôn thế à? 
## cho ví dụ về wifi profile public/private?
## WiFi profile là gì? (lần 2 — trong context firewall)
Xem câu trả lời ở phần trên. Tóm lại: mỗi mạng WiFi được gán profile Public/Private/Domain. Profile này quyết định bộ firewall rules nào được apply — và có cho phép local rules có hiệu lực hay không.
## wifi profile chỉ apply cho 1 wifi cụ thể thôi phải không?
## ai tạo ra wifi profile?

## Đổi WiFi từ Public → Private thì có ý nghĩa gì?
Profile Private cho phép local firewall rules có hiệu lực — rule "SuperApp BE 5000" sẽ được đọc và connection từ phone được allow.
## Tại sao profile Private cho phép local rule còn Public thì không?
Windows thiết kế theo mức tin cậy: Private = mạng nhà/văn phòng → tin cậy → local rules được đọc. Public = quán cà phê, sân bay → không tin cậy → GPO có thể tắt local rules (`LocalFirewallRules: N/A`) để bảo vệ người dùng khỏi vô tình mở port nguy hiểm.
## ý nghĩa của private/public trong private/public profile?

## ai tạo ra local rule? 
## tại sao local rules tắt thì có thể bảo vệ user? cho ví dụ?
## Tại sao mobile vào FE được nhưng gọi BE lại pending?
FE (port 3000) là webpack-dev-server — nó tự thêm exception trong Windows Firewall khi khởi động. BE (port 5000, .NET) thì không — phải có firewall rule thủ công, và rule đó bị vô hiệu do WiFi profile Public + GPO.

## webpack-dev-server là gì? Liên quan gì ở đây?
Một HTTP server nhỏ chạy trong development — phục vụ file FE (HTML, JS, CSS) và hỗ trợ HMR. Khi chạy `npm start`, thực chất là chạy webpack-dev-server trên port 3000. Liên quan mobile: đây là server mà phone cần kết nối vào để load app. Nó tự thêm Windows Firewall exception khi khởi động → port 3000 tự được mở, không cần thêm rule thủ công.
## vai trò của http server?
## khi vào localhost:3000 thì nó request đến http server để lấy html css js, rồi browser nhận và hiển thị lên có phải không?
## API pending có nghĩa là gì?
Browser đã gửi request đi, nhưng không nhận được response (kể cả không nhận được tín hiệu từ chối). Khác với "refused" là connection bị từ chối ngay. 
## lí do phổ biến gây ra request bị pending?
Pending thường do firewall drop packet (không response), server quá tải, hoặc network không route được tới đích.

## Chuyện gì xảy ra khi phone gõ `192.168.2.26:3000`?
1. Phone gửi packet TCP tới `192.168.2.26:3000` qua WiFi router
2. Router forward packet đến laptop (cùng subnet, không qua internet)
3. Laptop nhận packet tại WiFi adapter (`192.168.2.26`)
4. Windows Firewall kiểm tra: có rule nào allow port 3000 inbound không?
5. webpack-dev-server đã tạo exception → FE OK
6. Port 5000: rule có nhưng bị GPO override → drop packet → phone không nhận response → pending
## Khi thiết bị A truy cập B:3000, nghĩa là A gửi 1 packet đến B?
Đúng nhưng thực ra là nhiều packet. Flow HTTP cơ bản:
1. TCP handshake: 3 packet (SYN, SYN-ACK, ACK)
2. HTTP request: 1+ packet (GET / HTTP/1.1...)
3. HTTP response: nhiều packet (tùy kích thước file)
Mỗi packet có header chứa IP nguồn + IP đích. Router đọc IP đích để biết forward về đâu.


# Chrome Inspect & Port Forwarding

## `chrome://inspect/#devices` hoạt động thế nào?
Chrome trên laptop kết nối với Chrome trên phone qua USB (ADB — Android Debug Bridge). Khi phone cắm USB và bật USB Debugging, laptop "thấy" các tab đang mở trên Chrome phone và có thể inspect chúng.

## Port forwarding trong `chrome://inspect` là gì?
Tính năng cho phép Chrome trên phone truy cập các port trên laptop như thể chúng là port của chính phone. Cài `3000 → localhost:3000` thì khi phone request `localhost:3000`, ADB tunnel chuyển request đó sang `localhost:3000` trên laptop.
## Mỗi app thường chỉ có 1 port để nhận request thôi?
Thường đúng — BE dùng 5000, FE dùng 3000. Một port chỉ có 1 process bind được (không share). Một app có thể bind nhiều port (ví dụ HTTP 80 + HTTPS 443), nhưng thường không cần.
## 1 port chỉ bind được 1 process, nhưng 1 process thì bind được nhiều port phải không?
## Khi forward, phải có 1 app làm công việc nhận và forward đến port khác?
Đúng. Trong port forwarding qua USB, **ADB daemon** (chạy ngầm trên laptop) làm việc đó. ADB listen trên port phone, nhận packet từ phone qua USB cable, rồi gửi lại vào `localhost:PORT` của laptop.
## deamon là gì? đọc là gì?
## Port forwarding hoạt động thế nào ở tầng thấp hơn?
ADB tạo một tunnel qua USB cable. Phone gửi request tới `localhost:PORT` → ADB bắt lấy → forward qua USB → laptop nhận và xử lý → trả kết quả ngược lại qua USB → phone nhận response.

## Tại sao port forwarding không cần cùng mạng?
Vì traffic đi qua USB cable, không qua WiFi hay Ethernet. Không cần IP, không cần firewall rule, không cần CORS.
## Firewall chỉ áp dụng cho wireless thôi, còn cable thì không?
Sai. Firewall áp dụng cho **tất cả** network interfaces — WiFi, Ethernet cáp, VPN, Docker virtual network đều bị check. Lý do port forwarding qua USB "bypass" firewall không phải vì USB không bị check — mà vì ADB forward traffic thành connection từ `127.0.0.1` (loopback), và loopback thì firewall xem là local, không apply inbound rules.
## usb cable cũng là 1 network interface phải không?
## cable hay cổng usb là network interface?


# HMR & craco.config.js

## HMR là gì?
Hot Module Replacement — tính năng của webpack cho phép cập nhật code trong browser mà không cần reload toàn trang. Khi bạn sửa file, chỉ module đó được thay thế, state của app giữ nguyên.
## webpack là gì?
Công cụ "module bundler" — đọc tất cả file JS/TS/CSS/assets của project, xử lý (compile TypeScript, transpile ES6+, minify), rồi đóng gói thành các file output mà browser hiểu. Trong SuperApp, CRA + craco đã cấu hình webpack sẵn, không cần config thủ công.
## công việc của bundler là chuyển sourcecode thành html css js file để browser đọc phải không?
## HMR dùng giao thức gì để nhận thông báo từ server?
WebSocket — kết nối 2 chiều liên tục giữa browser và webpack-dev-server. Khi code thay đổi, server push thông báo qua WebSocket, browser tự fetch module mới.
## webpack-dev-server là http server phục vụ html css js file phải không?
## webpack-dev-server có nằm trong webpack không?
## websocket là 1 giao thức à?
## Khi code thay đổi, chuyện gì xảy ra?
1. File được save → webpack file watcher detect thay đổi
2. webpack compile lại module đó (chỉ module đó, không phải toàn bộ)
3. webpack-dev-server push thông báo qua WebSocket: "module X đã thay đổi"
4. Browser nhận → fetch module mới từ server
5. React HMR swap module cũ bằng module mới — không reload trang, state giữ nguyên
## module liên quan thế nào với file html css js file? hay module luôn là 1 file ?

## `craco.config.js` liên quan gì đến debug mobile?
craco cho phép override cấu hình webpack-dev-server của CRA. Để debug mobile qua IP, cần:
- `host: "0.0.0.0"` — dev server lắng nghe trên mọi interfaces
- `allowedHosts: "all"` — cho phép request từ bất kỳ host nào
- `client.webSocketURL` — HMR WebSocket kết nối đúng host

## Tại sao cần `host: "0.0.0.0"` trong craco?
Mặc định webpack-dev-server bind `localhost` — chỉ nhận request từ chính máy. Đổi sang `0.0.0.0` thì phone mới gửi request vào được.
## 1 máy có nhiều ip, vậy 127.0.0.1 là loại ip nào trong số chúng?
## khi chạy localhost:3000 trên browser, thì request gửi đến webpack dev server sẽ có ip là ip của máy hiện tại, cũng là 127.0.0.1 phải không?

## Công việc của webpack-dev-server?
1. Serve `index.html` + JS bundle cho mọi route (SPA)
2. Watch file changes → trigger webpack recompile
3. Duy trì WebSocket connection để push HMR updates xuống browser
4. Proxy API requests nếu có cấu hình proxy

## Phone gửi request vào webpack-dev-server thế nào?
Phone mở Chrome → gõ `http://192.168.2.26:3000` → Chrome gửi HTTP GET tới IP đó port 3000 → packet đi qua WiFi → đến WiFi adapter laptop → webpack-dev-server đang listen `0.0.0.0:3000` nhận request → trả `index.html` → browser load JS bundle → React app chạy.


## `WDS_SOCKET_HOST` và `WDS_SOCKET_PORT` là gì?
Biến env cho webpack-dev-server biết HMR WebSocket nên kết nối tới host và port nào.
## WebSocket hoạt động thế nào? Ví dụ đơn giản?
Khác HTTP (gửi → nhận → đóng), WebSocket là kết nối **2 chiều liên tục**:
1. Client gửi HTTP request đặc biệt: `Upgrade: websocket`
2. Server đồng ý → connection được "upgrade", không đóng nữa
3. Cả 2 bên gửi message bất cứ lúc nào, không cần request/response

Ví dụ HMR: browser mở WebSocket tới `ws://192.168.2.26:3000/ws` → giữ kết nối → khi code thay đổi, server tự push message "reload module X" → browser nhận ngay, không cần polling.
## websocket nhanh là vì connection luôn mở phải không?
<!-- ## Tại sao cần đặt `WDS_SOCKET_HOST`?
Mặc định WebSocket kết nối tới `localhost` — khi phone mở page qua IP (`192.168.2.26:3000`), WebSocket vẫn thử kết nối `localhost:3000` (là chính phone) → fail. Đặt `WDS_SOCKET_HOST=192.168.2.26` thì WebSocket kết nối đúng IP laptop. -->

<!-- ## `webSocketURL: "auto://0.0.0.0:0/ws"` thay thế `WDS_SOCKET_HOST` như thế nào?
`auto` = tự lấy host từ URL mà page đang được load. Phone mở `http://192.168.2.26:3000` → WebSocket tự kết nối `ws://192.168.2.26:3000/ws`. Không cần hardcode IP — tổng quát hơn `WDS_SOCKET_HOST`. -->

<!-- ## `applicationUrl` trong `launchSettings.json` là gì?
URL mà .NET BE lắng nghe khi chạy. Không phải prefix của API endpoint — đó chỉ là host:port mà server bind. Ví dụ `http://0.0.0.0:5000` = lắng nghe mọi interface trên port 5000. API path (`/api/k/...`) là phần riêng của routing. -->

## `applicationUrl` chính là "lỗ tai" của app phải không?
Đúng. `applicationUrl` là địa chỉ mà app lắng nghe — ai gọi vào thì app nhận. Cụ thể là IP:port mà server bind để chờ connection. API path (`/api/k/...`) là phần riêng của routing bên trong app, không liên quan đến `applicationUrl`.

## IP và host luôn có nghĩa tương tự nhau?
Không hoàn toàn. **IP** là địa chỉ số (`192.168.2.26`). **Host** rộng hơn — có thể là IP hoặc domain name (`localhost`, `example.com`). Domain được DNS resolve thành IP. Trong config như `host: "0.0.0.0"` hay `WDS_SOCKET_HOST`, "host" ở đây thực chất là IP/hostname mà server bind hoặc client kết nối tới.
## host có nghĩa là máy vật lí không?

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
## TCP connection là gì? @

## Test từ laptop thành công nhưng phone vẫn không reach được — tại sao?
Vì test từ laptop tới chính laptop bypass firewall inbound rules. Phone là external device bị chặn bởi firewall.

## firewall làm sao xác định device là external device? @
<!-- ## `LocalFirewallRules: N/A (GPO-store only)` có nghĩa gì?
Local firewall rules bị ignore trên profile đó — chỉ GPO-managed rules mới có hiệu lực. -->
<!-- 
## WiFi profile mặc định là gì và tại sao gây vấn đề?
Profile `Public`. Trên Public, `LocalFirewallRules: N/A` nên local allow rules không có tác dụng. -->
## wifi profile là gì? @
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

## ip của các thiết bị dùng chung wifi thì có đặc điểm gì? @
## Gateway là gì?
Gateway (thường là router) là cổng ra vào của subnet — mọi traffic đi ra ngoài internet đều qua đây. Trong ví dụ trên là `192.168.2.253`.

## Interface là gì (trong route print)?
Interface là card mạng (network adapter) đang được dùng để gửi packet. `192.168.2.26` là IP của WiFi adapter — nghĩa là laptop dùng WiFi để gửi traffic ra ngoài.
## cho tôi sơ đồ thành phần trong mạng đơn giản? @
## Router ở đây có phải cục mạng vật lý không?
Đúng. Router là thiết bị vật lý mà laptop cắm cáp hoặc kết nối WiFi vào. Nó có IP riêng trong subnet (ví dụ `192.168.2.253`) và có nhiệm vụ định tuyến traffic.

## IP của router là bao nhiêu?
IP của router trong subnet là **gateway IP** — trong trường hợp này là `192.168.2.253`. Đây là IP "phía trong" (LAN). Router còn có IP "phía ngoài" (WAN) để kết nối internet, nhưng ta không cần quan tâm.
## ip của router luôn là `192.168.2.253 à ? @

## PC dùng cáp Ethernet thì subnet có khác WiFi không?
Có thể khác hoặc giống, tùy cấu hình router. Thông thường trong nhà, cùng router thì cùng subnet dù dùng cáp hay WiFi. Trường hợp này khác vì `192.168.2.1` (Ethernet) là **static IP cấu hình thủ công**, không phải do router cấp — nên nó tách biệt với WiFi IP `192.168.2.26`.

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
## 127.0.0.1:5000 gọi là gì nhỉ? @
## 0.0.0.0:5000 lại nhận connection từ mọi IP ?
vì 0.0.0.0 đại diện cho tất cả network interfaces
## `0.0.0.0` nghĩa là gì?
Đại diện cho "tất cả network interfaces". Khi BE bind `0.0.0.0:5000`, nó lắng nghe trên cả `localhost`, `192.168.2.26`, `192.168.2.1`, và mọi IP khác của máy.
## 1 máy có nhiều ip à ? @

## Tại sao Windows Firewall block inbound từ external device?
Đây là hành vi mặc định — bảo vệ máy khỏi kết nối không mong muốn từ bên ngoài. Mọi inbound connection từ device khác đều bị block trừ khi có rule cho phép.

## Local rule là gì?
Rule firewall được tạo thủ công trên máy (qua Windows Defender Firewall hoặc `netsh`). Khác với GPO rule được đẩy xuống từ hệ thống quản trị tập trung.
## có 2 loại rule chính là local rule và gpo rule à ?@
## window firewall chỉ đơn giản là tập hợp các local rule + gpo rule à ?@

## GPO là gì?
Group Policy Object — cơ chế quản lý cấu hình Windows tập trung, thường dùng trong môi trường doanh nghiệp/domain. Admin IT có thể đẩy policy xuống máy người dùng, override local settings.
## so sánh rule và policy ?@


## Tại sao local firewall rule không có tác dụng trên WiFi profile Public?
Vì GPO đặt `LocalFirewallRules: N/A (GPO-store only)` trên profile Public — chỉ GPO rules mới được đọc, local rules bị bỏ qua hoàn toàn.
## wifi profile là gì? @
## Đổi WiFi từ Public → Private thì có ý nghĩa gì?
Profile Private cho phép local firewall rules có hiệu lực — rule "SuperApp BE 5000" sẽ được đọc và connection từ phone được allow.
## tại sao profile private cho phép local rule và chúng có liên hệ gì ? @


## Tại sao mobile vào FE được nhưng gọi BE lại pending?
FE (port 3000) là webpack-dev-server — nó tự thêm exception trong Windows Firewall khi khởi động. BE (port 5000, .NET) thì không — phải có firewall rule thủ công, và rule đó bị vô hiệu do WiFi profile Public + GPO.

## webpack-dev-server là gì? liên quan gì ở đây ? @

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
## khi thiết bị A đi đến 1 B:3000, thì nghĩa là nó gửi 1 packet đến B à? @


# Chrome Inspect & Port Forwarding

## `chrome://inspect/#devices` hoạt động thế nào?
Chrome trên laptop kết nối với Chrome trên phone qua USB (ADB — Android Debug Bridge). Khi phone cắm USB và bật USB Debugging, laptop "thấy" các tab đang mở trên Chrome phone và có thể inspect chúng.

## Port forwarding trong `chrome://inspect` là gì?
Tính năng cho phép Chrome trên phone truy cập các port trên laptop như thể chúng là port của chính phone. Cài `3000 → localhost:3000` thì khi phone request `localhost:3000`, ADB tunnel chuyển request đó sang `localhost:3000` trên laptop.
## mỗi app thường chỉ có 1 port để nhận request thôi phải không? @
## khi forward, phải có 1 app làm công việc nhận request và forward đến port khác, url khác phải không?

## Port forwarding hoạt động thế nào ở tầng thấp hơn?
ADB tạo một tunnel qua USB cable. Phone gửi request tới `localhost:PORT` → ADB bắt lấy → forward qua USB → laptop nhận và xử lý → trả kết quả ngược lại qua USB → phone nhận response.

## Tại sao port forwarding không cần cùng mạng?
Vì traffic đi qua USB cable, không qua WiFi hay Ethernet. Không cần IP, không cần firewall rule, không cần CORS.
## firewall chỉ áp dụng cho wireless thôi phải không? còn cable thì k apply phải k? @!



# HMR & craco.config.js

## HMR là gì?
Hot Module Replacement — tính năng của webpack cho phép cập nhật code trong browser mà không cần reload toàn trang. Khi bạn sửa file, chỉ module đó được thay thế, state của app giữ nguyên.
## webpack là gì?@

## HMR dùng giao thức gì để nhận thông báo từ server?
WebSocket — kết nối 2 chiều liên tục giữa browser và webpack-dev-server. Khi code thay đổi, server push thông báo qua WebSocket, browser tự fetch module mới.
## khi code thay đổi, chuyện gì xảy ra? @

## `craco.config.js` liên quan gì đến debug mobile?
craco cho phép override cấu hình webpack-dev-server của CRA. Để debug mobile qua IP, cần:
- `host: "0.0.0.0"` — dev server lắng nghe trên mọi interfaces
- `allowedHosts: "all"` — cho phép request từ bất kỳ host nào
- `client.webSocketURL` — HMR WebSocket kết nối đúng host

## Tại sao cần `host: "0.0.0.0"` trong craco?
Mặc định webpack-dev-server bind `localhost` — chỉ nhận request từ chính máy. Đổi sang `0.0.0.0` thì phone mới gửi request vào được.
## công việc của webpack-dev-server ?@
## phone gửi request vào webpack-dev-server thế nào? ví dụ? @


## `WDS_SOCKET_HOST` và `WDS_SOCKET_PORT` là gì?
Biến env cho webpack-dev-server biết HMR WebSocket nên kết nối tới host và port nào.
## websocket hoạt động thế nào? ví dụ đơn giản ? @

## Tại sao cần đặt `WDS_SOCKET_HOST`?
Mặc định WebSocket kết nối tới `localhost` — khi phone mở page qua IP (`192.168.2.26:3000`), WebSocket vẫn thử kết nối `localhost:3000` (là chính phone) → fail. Đặt `WDS_SOCKET_HOST=192.168.2.26` thì WebSocket kết nối đúng IP laptop.

<!-- ## `webSocketURL: "auto://0.0.0.0:0/ws"` thay thế `WDS_SOCKET_HOST` như thế nào?
`auto` = tự lấy host từ URL mà page đang được load. Phone mở `http://192.168.2.26:3000` → WebSocket tự kết nối `ws://192.168.2.26:3000/ws`. Không cần hardcode IP — tổng quát hơn `WDS_SOCKET_HOST`. -->

## `applicationUrl` trong `launchSettings.json` là gì?
URL mà .NET BE lắng nghe khi chạy. Không phải prefix của API endpoint — đó chỉ là host:port mà server bind. Ví dụ `http://0.0.0.0:5000` = lắng nghe mọi interface trên port 5000. API path (`/api/k/...`) là phần riêng của routing.

## appUrl chính là lỗ tai của app phải không?@
## ip và host luôn có nghĩa tương tự nhau à?@
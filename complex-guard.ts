@Injectable()
export class AuthSettingsGuard implements CanActivate {
  constructor(
    public injector: Injector,
    private httpClient: HttpClient,
    private authSettingsService: AuthSettingsService,
    @Inject(ApiHostUrlToken) private apiHostUrl: string,
    @Inject(ApplicationBuildName) private applicationBuildName: string,
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    return this.httpClient
      .get(`${this.apiHostUrl}maintenance-service/appconfigurations/${this.applicationBuildName}`, {   //отправляем запрос для получения данных
        headers: { [ignoreAuthorizationHeader]: 'true' },
      })                                                                                               //получаем Observable 
      .pipe(                                                                                           //для дальнейшей работы с потоком данных применяем метод pipe для объединения операторов
        tap((appSettings: AppSettings) => {                                                            //с помощью оператора tap выполняем побочные действия, не влияя на поток, - 
          this.authSettingsService.authSettings.next(appSettings);                                     //передаем в поток authSettings новое значение appSettings, полученное посредством отправки запроса в самом начале ?? не уверена!, не понимаю, зачем нам этоу нужно
        }),
        switchMap(() => {                                                                              //переключаемся на новый поток, подписывается на него, отписывается от старого
          const guards = <Token[]>route.data.dependentGuards;                                          //получаем зависимые (дополнительные?) гварды в зависимости от рута

          return combineLatest(                                                                        //сохраняем последние значения из последовательности ?? не совсем понимаю, зачем он здесь нужен, здесь же один поток? или изменяющийся массив рассматривается как несколько потоков?       
            guards.map(internalGuard => {                                                              //проходимся по массиву зависимых гвардов
              const guard = this.injector.get(internalGuard);
              const result = guard.canActivate(route, state);                                          //для каждого гварда получаем его значение 

              if (result instanceof Observable) {                                           
                return result;
              } else if (result instanceof Promise) {                                                  //если полученное значение не Observable, то преобразуем его в Observable 
                return from(result);
              } else {
                return of(result);(true
              }
            }),
          ).pipe(map(params => params.every(value => Boolean(value))));                                 //проходит по массиву значений (каждое из которых массив значений) и заменяет каждый из массивов на его булево значения и получаем что-то похожее на [true, false...]
        }),
      );
  }
}                                                                                                     //результат должен быть типа of(true) или of(false)? А где мы его получаем, если остается массив of([true, false...])?

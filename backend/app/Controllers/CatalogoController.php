<?php

declare(strict_types=1);

namespace CloudCR\Controllers;

use CloudCR\Core\Request;
use CloudCR\Core\Response;
use CloudCR\Repositories\CatalogoRepository;

final class CatalogoController extends BaseController
{
    public function __construct(private CatalogoRepository $repo = new CatalogoRepository())
    {
    }

    public function index(Request $r): void
    {
        Response::ok($this->repo->todos());
    }
}
